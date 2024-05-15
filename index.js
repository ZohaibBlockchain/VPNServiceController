const express = require('express');
const { exec } = require('child_process');
const app = express();
const port = 14500;

app.use(express.json());

// Check if a peer exists in the WireGuard configuration
app.get('/peer/:publicKey', (req, res) => {
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
app.post('/peer', (req, res) => {
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
app.delete('/peer/:publicKey', (req, res) => {
  const { publicKey } = req.params;

  checkPeerInWireGuard(publicKey, (err, existsInWireGuard) => {
    if (err) {
      res.status(500).send({ message: 'Failed to check peer in WireGuard.', error: err });
    } else if (!existsInWireGuard) {
      res.status(404).send({ message: 'Peer not found.' });
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

app.listen(port, () => {
  console.log(`WireGuard API listening at http://localhost:${port}`);
});
