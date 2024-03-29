from google.colab import userdata
import requests
from bs4 import BeautifulSoup
import re
import json
from langchain.prompts import PromptTemplate
from langchain_google_genai import GoogleGenerativeAI, HarmBlockThreshold, HarmCategory
from langchain_openai import OpenAI
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains.summarize import load_summarize_chain

# Get API keys
google_api_key = userdata.get('GOOGLE_API_KEY')
openai_api_key = userdata.get('OPENAI_API_KEY')
rapid_api_key = userdata.get('RAPID_API_KEY')


def scrape_article_content(url):
    print("\r\n Scraping article content...")
    medium_pattern = r'medium\.com'
    devto_pattern = r'dev\.to'
    medium_id_pattern = r"-(\w+)$"
    medium_id_edit_pattern = r'/p/([\w-]+)/edit/?'

    if re.search(medium_pattern, url, re.IGNORECASE):
        matches = re.findall(medium_id_pattern, url) or re.findall(medium_id_edit_pattern, url)
        if matches:
            extracted_id = matches[0]
            api_url = f"https://medium2.p.rapidapi.com/article/{extracted_id}/content"
            try:
                headers = {
                    'X-RapidAPI-Key': rapid_api_key,
                    'X-RapidAPI-Host': "medium2.p.rapidapi.com"
                }
                querystring = {"fullpage": "true", "style_file": "https://mediumapi.com/styles/dark.css"}
                response = requests.get(api_url, headers=headers, params=querystring)
                response.raise_for_status()
            except requests.exceptions.RequestException as e:
                print("Failed to fetch article content")
            data = response.json()
            content = data.get("content")
            if content:
                return content
            else:
                print("Couldn't scrape content")
        else:
            print("Article ID not found in the URL.")
            
    elif re.search(devto_pattern, url, re.IGNORECASE):
        headers = {'Access-Control-Allow-Origin': '*'}
        response = requests.get(url, headers=headers)
        soup = BeautifulSoup(response.text, 'html.parser')
        article_content = soup.find('article')
        if article_content and article_content.get_text(strip=True):
            content = article_content.get_text(strip=True)
            return content
        else:
            print("Couldn't scrape content")
    else:
        print("Unsupported URL domain")


def summarize_long_article(article, chunk_size=10000, chunk_overlap=20, max_tokens=4000):
    llm_gemini = GoogleGenerativeAI(model="gemini-pro", google_api_key=google_api_key,
                                    safety_settings={HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE})
    num_tokens = llm_gemini.get_num_tokens(article)

    if num_tokens < max_tokens:
        print("\r\n Summarization not needed...")
        return article
    else:
        print("Summarization needed...")
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        chunks = text_splitter.create_documents([article])

        map_template = """
        Write a summary of the following:
        "{text}"
        SUMMARY:
        """
        map_prompt = PromptTemplate.from_template(template=map_template)
        map_prompt.format(text="text")

        combine_template = """
        Write a long summary of the following article (around 2000 tokens).
        ```{text}```
        SUMMARY:
        """
        combine_prompt = PromptTemplate.from_template(template=combine_template)
        combine_prompt.format(text="text")

        # num_docs = len(chunks)
        # num_tokens_first_doc = llm_gemini.get_num_tokens(chunks[0].page_content)
        # print(f"Now we have {num_docs} documents and the first one has {num_tokens_first_doc} tokens")

        summary_chain = load_summarize_chain(
            llm=llm_gemini,
            chain_type='map_reduce',
            map_prompt=map_prompt,
            combine_prompt=combine_prompt,
            verbose=False
        )

        output = summary_chain.invoke(chunks)
        summary = output['input_documents'][0]
        content = summary.page_content
        return content
    
def generate_posts(article, url):
    print("\r\n Generating posts...")
    template = """You are an experienced technical writer. Generate a post to share on social media based on this article discussing a specific topic:
    Article: {article}

    Here is the social media posts structure to respect:
        - a Catchy title introducing the topic, accompanied by an emoji, don't add any label like 'Title: ...' for example
        - List of key ideas and takeaways or bullet points extracted from the article content and focus on providing the article's value, each bullet point preceded by an emoji. Don't add a 'Key Ideas:' label.
        - Read more: Hyperlink emoji followed by the provided link {url}.
        - Wish to post readers a great day.
        - List of relevant hashtags by the end to increase visibility on social media platforms; don't add the 'Hashtags:' label.

    Be friendly and informative.
    """
    prompt = PromptTemplate.from_template(template)
    llm_gemini = GoogleGenerativeAI(model="gemini-pro", google_api_key=google_api_key,
                                    safety_settings={HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE})
    chain_gemini = prompt | llm_gemini
    gemini_post = chain_gemini.invoke({"article": article, "url": url})
    print("\r\n Generated post from Gemini: \r\n ", gemini_post)

    llm_openai = OpenAI(model_name="gpt-3.5-turbo-instruct", openai_api_key=openai_api_key, temperature=0.8)
    chain_openai = prompt | llm_openai
    openai_post = chain_openai.invoke({"article": article, "url": url})
    print("\r\nGenerated post from OpenAI: \r\n ", openai_post)

    return [gemini_post, openai_post]

# Main function
def article_to_posts():
    url = 'URL_HERE'
    article_content = scrape_article_content(url)
    summarized_article = summarize_long_article(article_content)

    if summarized_article:
        posts = generate_posts(summarized_article, url)
    else:
        print("Failed to summarize article's content")

