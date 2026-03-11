const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const messagesContainer = document.getElementById('messages');

function addMessage(content, type) {
  const welcome = messagesContainer.querySelector('.welcome');
  if (welcome) welcome.remove();
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;
  messageDiv.textContent = content;
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function sendMessage() {
  const content = messageInput.value.trim();
  if (!content) return;
  addMessage(content, 'user');
  messageInput.value = '';
  setTimeout(() => {
    addMessage('This is a placeholder response. Agent integration coming soon!', 'assistant');
  }, 500);
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
console.log('Running on platform:', window.electronAPI?.platform || 'unknown');
