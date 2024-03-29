// Function to fetch data from the specified URL
function fetchData(url) {
  return new Promise((resolve, reject) => {
    fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*'
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => resolve(data))
    .catch(error => reject(error));
  });
}

// Function to simulate fetching data (for testing/development)
function fetchDataMock() {
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockData = [
        "💡 Angular's Standalone Feature: A Game-Changer in App Development\n\n🌟 Key Ideas:\n- 🌐 Eliminates module-based app structure\n- 📦 Components become self-contained and manage dependencies\n- 🛠️ Generate standalone components with Angular CLI\n- 🧩 Explicitly import only what you need for tree-shakability\n- 👻 Virtual NgModule created for each standalone component\n- 🚫 Limitations: no multiple component bootstrapping\n- 🔗 Read more: https://medium2.p.rapidapi.com/article/2a1ceade2580/html\n\n#Angular #Standalone #Development #ComponentBased",
        "\n🔥 Angular's Latest Game-Changer: The Standalone Feature 💥\n📝 No more module-based apps, fully component-based now!\n👉 Angular CLI fully supports standalone feature since v17\n💡 Components are now self-contained & can explicitly manage dependencies\n👀 Watch the video version for a visual breakdown\nRead more 🔗 https://medium2.p.rapidapi.com/article/2a1ceade2580/html\n#AngularEvolution #StandaloneFeature #ComponentBased #AngularDevelopment #WebDevelopment"
      ];
      resolve(mockData);
    }, 1000); // Simulate fetch delay
  });
}

// Event listener to handle incoming messages from the main thread
self.addEventListener('message', function(event) {
  const { url } = event.data;
  
  // Call the appropriate function to fetch data
  fetchData(url)
    .then(data => {
      // Send the fetched data back to the main thread
      self.postMessage(data);
    })
    .catch(error => {
      // Handle errors during data fetching
      console.error('Error fetching data:', error);
      // Send an error response back to the main thread
      self.postMessage({ error: error.message });
    });
});
