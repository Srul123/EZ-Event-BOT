<template>
  <div class="app">
    <header>
      <h1>EZ-Event Admin</h1>
      <p>Vue 3 Development Server is running!</p>
    </header>
    <main>
      <div class="welcome">
        <p>Welcome to the admin web interface.</p>
      </div>
    </main>
  </div>
</template>

<script setup>
// Vue 3 Composition API
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

header {
  text-align: center;
  margin-bottom: 2rem;
}

h1 {
  font-size: 3rem;
  margin: 0 0 1rem 0;
  font-weight: 700;
}

p {
  font-size: 1.25rem;
  margin: 0.5rem 0;
}

.welcome {
  background: rgba(255, 255, 255, 0.1);
  padding: 2rem;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}
</style>
