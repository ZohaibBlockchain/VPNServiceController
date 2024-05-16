const express = require('express');
const { exec } = require('child_process');
const app = express();
const port = 14500;

app.use(express.json());

// Check if a peer exists in the WireGuard configuration
app.get('/api/peer/:publicKey', (req, res) => {
  const { publicKey } = req.params;

  checkPeerInWireGuard(publicKey, (err, existsInWireGuard) => {
    if (err) {
      res.status(500).send({ message: 'Failed to check peer in WireGuard.', error: err });
    } else if (existsInWireGuard) {
      res.status(200).send({ message: 'Peer exists.' });
    } else {
      res.status(404).send({ message: 'Peer not found.' });
    }
  });
});

// Add a peer
app.post('/api/peer', (req, res) => {
  const { publicKey, allowedIPs } = req.body;

  checkPeerInWireGuard(publicKey, (err, existsInWireGuard) => {
    if (err) {
      res.status(500).send({ message: 'Failed to check peer in WireGuard.', error: err });
    } else if (existsInWireGuard) {
      res.status(400).send({ message: 'Peer already exists.' });
    } else {
      addPeerToWireGuard(publicKey, allowedIPs, (err) => {
        if (err) {
          res.status(500).send({ message: 'Failed to add peer.', error: err });
        } else {
          res.status(201).send({ message: 'Peer added.' });
        }
      });
    }
  });
});

// Remove a peer
app.delete('/api/peer/:publicKey', (req, res) => {
  const { publicKey } = req.params;

  checkPeerInWireGuard(publicKey, (err, existsInWireGuard) => {
    if (err) {
      res.status(500).send({ message: 'Failed to check peer in WireGuard.', error: err });
    } else if (!existsInWireGuard) {
      res.status(200).send({ message: 'Peer not found.' });
    } else {
      removePeerFromWireGuard(publicKey, (err) => {
        if (err) {
          res.status(500).send({ message: 'Failed to remove peer.', error: err });
        } else {
          res.status(200).send({ message: 'Peer removed.' });
        }
      });
    }
  });
});



// GET endpoint to check available IP address
app.get('/api/available-ip', (req, res) => {
  const subnet = '10.200.200.0/32'; // Default subnet
  
  getAvailableIPAddress(subnet, (err, availableIP) => {
    if (err) {
      res.status(500).send({ message: `Failed to get available IP: ${err.message}` });
    } else {
      res.status(200).send({ availableIP });
    }
  });
});



// Function to add a peer to WireGuard
function addPeerToWireGuard(publicKey, allowedIPs, callback) {
  const command = `wg set wg0 peer ${publicKey} allowed-ips ${allowedIPs}`;
  exec(command, (err, stdout, stderr) => {
    if (err) {
      console.error(`Error adding peer: ${stderr}`);
      return callback(err);
    }
    console.log(`Peer added: ${stdout}`);
    callback(null);
  });
}

// Function to remove a peer from WireGuard
function removePeerFromWireGuard(publicKey, callback) {
  const command = `wg set wg0 peer ${publicKey} remove`;
  exec(command, (err, stdout, stderr) => {
    if (err) {
      console.error(`Error removing peer: ${stderr}`);
      return callback(err);
    }
    console.log(`Peer removed: ${stdout}`);
    callback(null);
  });
}

// Function to check if a peer exists in WireGuard configuration
function checkPeerInWireGuard(publicKey, callback) {
  const command = `wg show wg0 peers`;
  exec(command, (err, stdout, stderr) => {
    if (err) {
      console.error(`Error checking peer: ${stderr}`);
      return callback(err);
    }
    const peers = stdout.split('\n').map(peer => peer.trim());
    const exists = peers.includes(publicKey);
    callback(null, exists);
  });
}

// Function to get the list of WireGuard peers and return an available address
function getAvailableIPAddress(subnet, callback) {
  const command = `wg show wg0 allowed-ips`;
  
  exec(command, (err, stdout, stderr) => {
    if (err) {
      console.error(`Error fetching peers: ${stderr}`);
      return callback(err);
    }

    // Parse the output to get the list of used IPs
    const usedIPs = stdout.split('\n')
                          .map(line => line.split('\t')[1])
                          .filter(ip => ip && ip.includes('/'));

    console.log(usedIPs);

    const availableIP = findAvailableIP(subnet, usedIPs);
    
    if (availableIP) {
      callback(null, availableIP);
    } else {
      callback(new Error('No available IP address found in the subnet'));
    }
  });
}

// Function to find an available IP in the subnet
function findAvailableIP(subnet, usedIPs) {
  const [subnetBase, subnetMask] = subnet.split('/');
  const subnetPrefix = subnetBase.split('.').slice(0, 3).join('.');

  const start = 2; // Starting host number
  const end = 254; // Ending host number

  for (let i = start; i <= end; i++) {
    const candidateIP = `${subnetPrefix}.${i}`;
    const candidateCIDR = `${candidateIP}/${subnetMask}`;
    
    console.log(candidateCIDR);
    if (!usedIPs.includes(candidateCIDR)) {
      return candidateCIDR;
    }
  }
  
  return null;
}






app.listen(port, () => {
  console.log(`WireGuard API listening at http://localhost:${port}`);
});
