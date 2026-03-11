/**
 * Port Availability Checker Utility
 */

const net = require('net');

/**
 * Check if a specific port is available
 * @param {number|string} port - Port number to check
 * @returns {Promise<boolean>} - True if port is available
 */
function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(parseInt(port), '0.0.0.0', () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    server.on('error', () => resolve(false));
  });
}

/**
 * Check multiple ports at once
 * @param {string[]} ports - Array of port numbers
 * @returns {Promise<Object>} - Object mapping port to availability
 */
async function checkPorts(ports) {
  const results = {};
  await Promise.all(ports.map(async (port) => {
    results[port] = await checkPort(port);
  }));
  return results;
}

/**
 * Find an available port in a range
 * @param {number} startPort - Starting port
 * @param {number} endPort - Ending port
 * @returns {Promise<number|null>} - Available port or null
 */
async function findAvailablePort(startPort, endPort) {
  for (let port = startPort; port <= endPort; port++) {
    if (await checkPort(port)) {
      return port;
    }
  }
  return null;
}

/**
 * Get service name for common ports
 * @param {string|number} port - Port number
 * @returns {string} - Service name or 'Unknown'
 */
function getServiceName(port) {
  const services = {
    '80': 'HTTP',
    '443': 'HTTPS',
    '8001': 'Higress Gateway',
    '8008': 'Matrix Server',
    '8080': 'HTTP Proxy',
    '9000': 'MinIO',
    '6167': 'Matrix (alt)',
    '3030': 'Web UI',
    '3000': 'Dev Server',
    '5432': 'PostgreSQL',
    '3306': 'MySQL',
    '6379': 'Redis',
    '27017': 'MongoDB'
  };
  return services[String(port)] || 'Unknown';
}

module.exports = {
  checkPort,
  checkPorts,
  findAvailablePort,
  getServiceName
};
