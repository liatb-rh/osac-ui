/**
 * Shared /api/os-images and /api/host-classes handlers (ConfigMap file or fallback).
 * Used by production server and Vite standalone dev middleware.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FALLBACK_OS_IMAGES = {
  images: [
    {
      os: 'fedora',
      displayName: 'Fedora',
      icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/fedora/fedora-original.svg',
      repository: 'quay.io/containerdisks/fedora',
      versions: ['43', '42', '41'],
      osType: 'linux',
    },
    {
      os: 'centos-stream',
      displayName: 'CentOS Stream',
      icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/centos/centos-original.svg',
      repository: 'quay.io/containerdisks/centos-stream',
      versions: ['10', '9'],
      osType: 'linux',
    },
    {
      os: 'ubuntu',
      displayName: 'Ubuntu',
      icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/ubuntu/ubuntu-original.svg',
      repository: 'quay.io/containerdisks/ubuntu',
      versions: ['25.04', '24.04'],
      osType: 'linux',
    },
    {
      os: 'debian',
      displayName: 'Debian',
      icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/debian/debian-original.svg',
      repository: 'quay.io/containerdisks/debian',
      versions: ['13', '12', '11'],
      osType: 'linux',
    },
  ],
};

const FALLBACK_HOST_CLASSES = {
  fc430: {
    name: 'FC430',
    description: 'Cisco UCS C240 M4',
    category: 'Compute Optimized',
    cpu: { type: 'Intel Xeon E5-2680 v4', cores: 28, sockets: 2, threadsPerCore: 2 },
    ram: { size: '256GB', type: 'DDR4' },
    disk: { type: 'SSD', size: '2x 480GB', interface: 'SATA' },
    gpu: null,
  },
  fc640: {
    name: 'FC640',
    description: 'Dell PowerEdge R640',
    category: 'Balanced',
    cpu: { type: 'Intel Xeon Gold 6238R', cores: 56, sockets: 2, threadsPerCore: 2 },
    ram: { size: '384GB', type: 'DDR4' },
    disk: { type: 'NVMe SSD', size: '4x 960GB', interface: 'PCIe' },
    gpu: null,
  },
  fc740: {
    name: 'FC740',
    description: 'HPE ProLiant DL380 Gen10',
    category: 'Storage Optimized',
    cpu: { type: 'Intel Xeon Gold 6248R', cores: 48, sockets: 2, threadsPerCore: 2 },
    ram: { size: '512GB', type: 'DDR4' },
    disk: { type: 'NVMe SSD', size: '8x 1.6TB', interface: 'PCIe' },
    gpu: null,
  },
};

/**
 * @param {import('express').Express} app
 * @param {(message: string, err: unknown) => void} [logError]
 */
export function registerCatalogApi(app, logError) {
  const log = logError || (() => {});

  app.get('/api/os-images', (req, res) => {
    const osImagesPath = path.join(__dirname, '../config/os-images.json');
    try {
      if (fs.existsSync(osImagesPath)) {
        res.json(JSON.parse(fs.readFileSync(osImagesPath, 'utf8')));
      } else {
        res.json(FALLBACK_OS_IMAGES);
      }
    } catch (error) {
      log('Error reading OS images config', error);
      res.status(500).json({ error: 'Failed to load OS images catalog' });
    }
  });

  app.get('/api/host-classes', (req, res) => {
    const hostClassesPath = path.join(__dirname, '../config/host-classes.json');
    try {
      if (fs.existsSync(hostClassesPath)) {
        res.json(JSON.parse(fs.readFileSync(hostClassesPath, 'utf8')));
      } else {
        res.json(FALLBACK_HOST_CLASSES);
      }
    } catch (error) {
      log('Error reading host classes config', error);
      res.status(500).json({ error: 'Failed to load host classes catalog' });
    }
  });
}
