/**
 * In-memory mock APIs mirroring fulfillment / private v1 routes used by the UI.
 * Shared by server/index.js (standalone) and vite dev middleware.
 */
import express from 'express';
import { randomUUID } from 'crypto';

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function listPayload(items, offset = 0, limit) {
  const total = items.length;
  const slice = limit != null ? items.slice(offset, offset + limit) : items.slice(offset);
  return { items: slice, total, size: slice.length };
}

function createInitialStore() {
  const clusterId = 'cluster-mock-001';
  const hostId = 'host-mock-001';

  return {
    virtual_machines: [
      {
        id: 'vm-mock-001',
        metadata: { name: 'demo-vm-fedora', creation_timestamp: new Date().toISOString(), creators: ['demo'] },
        spec: { template: 'tpl-mock-001', template_parameters: {} },
        status: { state: 'VIRTUAL_MACHINE_STATE_READY', ip_address: '192.168.1.101', hub: 'hub-mock-001' },
      },
      {
        id: 'vm-mock-002',
        metadata: { name: 'demo-vm-busy', creation_timestamp: new Date().toISOString(), creators: ['demo'] },
        spec: { template: 'tpl-mock-001', template_parameters: {} },
        status: { state: 'VIRTUAL_MACHINE_STATE_PROGRESSING', hub: 'hub-mock-001' },
      },
    ],
    virtual_machine_templates: [
      {
        id: 'tpl-mock-001',
        title: 'Generic Linux VM',
        description: 'Mock VM template for standalone demo',
        metadata: { creation_timestamp: new Date().toISOString(), creators: ['demo'] },
        parameters: [],
      },
      {
        id: 'tpl-mock-002',
        title: 'Small OCP helper',
        description: 'Second mock template',
        metadata: { creation_timestamp: new Date().toISOString(), creators: ['demo'] },
        parameters: [],
      },
    ],
    cluster_templates: [
      {
        id: 'cloudkit.templates.ocp_4_20_small',
        title: 'OpenShift 4.20 Small',
        description: 'Compact cluster for development',
        metadata: { version: '4.20', creators: ['demo'] },
        node_sets: { workers: { host_class: 'fc640', size: 3 } },
      },
      {
        id: 'cloudkit.templates.ocp_4_20_medium',
        title: 'OpenShift 4.20 Medium',
        description: 'Balanced production footprint',
        metadata: { version: '4.20', creators: ['demo'] },
        node_sets: { workers: { host_class: 'fc740', size: 5 } },
      },
    ],
    clusters: [
      {
        id: clusterId,
        metadata: { name: 'demo-cluster', creation_timestamp: new Date().toISOString(), creators: ['demo'], tenants: ['tenant-a'] },
        spec: {
          template: 'cloudkit.templates.ocp_4_20_small',
          template_parameters: {},
          node_sets: { workers: { host_class: 'fc640', size: 3, hosts: [hostId] } },
        },
        status: {
          state: 'CLUSTER_STATE_READY',
          api_url: 'https://api.demo-cluster.example.com:6443',
          console_url: 'https://console.demo-cluster.example.com',
          node_sets: { workers: { host_class: 'fc640', size: 3, hosts: [hostId] } },
          hub: 'hub-mock-001',
        },
      },
    ],
    hosts: [
      {
        id: hostId,
        metadata: { name: 'rack01-node01', creation_timestamp: new Date().toISOString(), creators: ['demo'], tenants: ['tenant-a'] },
        spec: {
          power_state: 'on',
          rack: 'R1',
          boot_ip: '10.0.0.21',
          boot_mac: '52:54:00:ab:cd:01',
          class: 'fc640',
        },
        status: {
          state: 'ready',
          power_state: 'on',
          cluster: clusterId,
          host_pool: 'pool-1',
        },
      },
      {
        id: 'host-mock-002',
        metadata: { name: 'rack01-node02', creation_timestamp: new Date().toISOString(), creators: ['demo'] },
        spec: { power_state: 'on', rack: 'R1', class: 'fc640' },
        status: { state: 'ready', power_state: 'on', cluster: '' },
      },
    ],
    hubs: [
      {
        id: 'hub-mock-001',
        metadata: { name: 'primary-hub', creation_timestamp: new Date().toISOString() },
        spec: {},
        status: { state: 'ready' },
      },
    ],
    tenants: [
      { id: 'tenant-a', metadata: { name: 'Acme Corp' } },
      { id: 'tenant-b', metadata: { name: 'Demo Tenant' } },
    ],
  };
}

export function createMockApiRouters() {
  const store = createInitialStore();

  const fulfillment = express.Router();
  const privateApi = express.Router();

  // --- Fulfillment v1 ---

  fulfillment.get('/virtual_machines', (req, res) => {
    const offset = Number(req.query.offset) || 0;
    const limit = req.query.limit != null ? Number(req.query.limit) : undefined;
    res.json(listPayload(store.virtual_machines, offset, limit));
  });

  fulfillment.get('/virtual_machines/:id', (req, res) => {
    const vm = store.virtual_machines.find((v) => v.id === req.params.id);
    if (!vm) return res.status(404).json({ error: 'not found' });
    res.json(vm);
  });

  fulfillment.post('/virtual_machines', (req, res) => {
    const body = req.body || {};
    const id = body.id || `vm-mock-${randomUUID().slice(0, 8)}`;
    const vm = {
      id,
      metadata: body.metadata || { name: `vm-${id}` },
      spec: body.spec || {},
      status: body.status || { state: 'VIRTUAL_MACHINE_STATE_PROGRESSING' },
    };
    store.virtual_machines.push(vm);
    res.status(201).json(vm);
  });

  fulfillment.put('/virtual_machines/:id', (req, res) => {
    const i = store.virtual_machines.findIndex((v) => v.id === req.params.id);
    if (i < 0) return res.status(404).json({ error: 'not found' });
    store.virtual_machines[i] = { ...store.virtual_machines[i], ...req.body, id: req.params.id };
    res.json(store.virtual_machines[i]);
  });

  fulfillment.delete('/virtual_machines/:id', (req, res) => {
    const i = store.virtual_machines.findIndex((v) => v.id === req.params.id);
    if (i < 0) return res.status(404).json({ error: 'not found' });
    store.virtual_machines.splice(i, 1);
    res.status(204).end();
  });

  fulfillment.get('/virtual_machine_templates', (req, res) => {
    const offset = Number(req.query.offset) || 0;
    const limit = req.query.limit != null ? Number(req.query.limit) : undefined;
    res.json(listPayload(store.virtual_machine_templates, offset, limit));
  });

  fulfillment.get('/virtual_machine_templates/:id', (req, res) => {
    const t = store.virtual_machine_templates.find((x) => x.id === req.params.id);
    if (!t) return res.status(404).json({ error: 'not found' });
    res.json(t);
  });

  fulfillment.post('/virtual_machine_templates', (req, res) => {
    const body = req.body || {};
    const id = body.id || `tpl-mock-${randomUUID().slice(0, 8)}`;
    const t = { id, title: body.title || id, description: body.description, metadata: body.metadata, parameters: body.parameters || [] };
    store.virtual_machine_templates.push(t);
    res.status(201).json(t);
  });

  fulfillment.patch('/virtual_machine_templates/:id', (req, res) => {
    const i = store.virtual_machine_templates.findIndex((x) => x.id === req.params.id);
    if (i < 0) return res.status(404).json({ error: 'not found' });
    const patch = req.body?.object || req.body || {};
    store.virtual_machine_templates[i] = { ...store.virtual_machine_templates[i], ...patch, id: req.params.id };
    res.json(store.virtual_machine_templates[i]);
  });

  fulfillment.delete('/virtual_machine_templates/:id', (req, res) => {
    const i = store.virtual_machine_templates.findIndex((x) => x.id === req.params.id);
    if (i < 0) return res.status(404).json({ error: 'not found' });
    store.virtual_machine_templates.splice(i, 1);
    res.status(204).end();
  });

  fulfillment.get('/cluster_templates', (req, res) => {
    const offset = Number(req.query.offset) || 0;
    const limit = req.query.limit != null ? Number(req.query.limit) : undefined;
    res.json(listPayload(store.cluster_templates, offset, limit));
  });

  fulfillment.post('/cluster_templates', (req, res) => {
    const body = req.body || {};
    const id = body.id || `tpl.cluster.${randomUUID().slice(0, 8)}`;
    const t = { ...clone(body), id };
    store.cluster_templates.push(t);
    res.status(201).json(t);
  });

  fulfillment.get('/clusters/:id/kubeconfig', (req, res) => {
    const c = store.clusters.find((x) => x.id === req.params.id);
    if (!c) return res.status(404).json({ error: 'not found' });
    const yaml = `apiVersion: v1\nkind: Config\nclusters:\n- cluster:\n    server: ${c.status?.api_url || 'https://127.0.0.1:6443'}\n  name: mock\n`;
    res.json({ data: Buffer.from(yaml, 'utf8').toString('base64') });
  });

  fulfillment.get('/clusters/:id/password', (req, res) => {
    const c = store.clusters.find((x) => x.id === req.params.id);
    if (!c) return res.status(404).json({ error: 'not found' });
    res.json({ data: Buffer.from('mock-admin-password', 'utf8').toString('base64') });
  });

  // --- Private v1 ---

  privateApi.get('/clusters', (req, res) => {
    const offset = Number(req.query.offset) || 0;
    const limit = req.query.limit != null ? Number(req.query.limit) : undefined;
    res.json(listPayload(store.clusters, offset, limit));
  });

  privateApi.get('/clusters/:id', (req, res) => {
    const c = store.clusters.find((x) => x.id === req.params.id);
    if (!c) return res.status(404).json({ error: 'not found' });
    res.json(c);
  });

  privateApi.post('/clusters', (req, res) => {
    const body = req.body || {};
    const id = body.id || `cluster-mock-${randomUUID().slice(0, 8)}`;
    const c = {
      id,
      metadata: body.metadata || { name: id },
      spec: body.spec || {},
      status: body.status || { state: 'CLUSTER_STATE_PROGRESSING' },
    };
    store.clusters.push(c);
    res.status(201).json(c);
  });

  privateApi.patch('/clusters/:id', (req, res) => {
    const i = store.clusters.findIndex((x) => x.id === req.params.id);
    if (i < 0) return res.status(404).json({ error: 'not found' });
    const cur = store.clusters[i];
    const patch = req.body || {};
    const nextSpec = {
      ...cur.spec,
      ...(patch.spec || {}),
      node_sets: {
        ...(cur.spec?.node_sets || {}),
        ...(patch.spec?.node_sets || {}),
      },
    };
    store.clusters[i] = {
      ...cur,
      spec: nextSpec,
      status: {
        ...cur.status,
        node_sets: {
          ...(cur.status?.node_sets || {}),
          ...(patch.spec?.node_sets || {}),
        },
      },
    };
    res.json(store.clusters[i]);
  });

  privateApi.delete('/clusters/:id', (req, res) => {
    const i = store.clusters.findIndex((x) => x.id === req.params.id);
    if (i < 0) return res.status(404).json({ error: 'not found' });
    store.clusters.splice(i, 1);
    res.status(204).end();
  });

  privateApi.get('/hosts', (req, res) => {
    const offset = Number(req.query.offset) || 0;
    const limit = req.query.limit != null ? Number(req.query.limit) : undefined;
    res.json(listPayload(store.hosts, offset, limit));
  });

  privateApi.get('/hosts/:id', (req, res) => {
    const h = store.hosts.find((x) => x.id === req.params.id);
    if (!h) return res.status(404).json({ error: 'not found' });
    res.json(h);
  });

  privateApi.delete('/hosts/:id', (req, res) => {
    const i = store.hosts.findIndex((x) => x.id === req.params.id);
    if (i < 0) return res.status(404).json({ error: 'not found' });
    store.hosts.splice(i, 1);
    res.status(204).end();
  });

  privateApi.put('/hosts/:id', (req, res) => {
    const i = store.hosts.findIndex((x) => x.id === req.params.id);
    if (i < 0) return res.status(404).json({ error: 'not found' });
    store.hosts[i] = { ...store.hosts[i], ...req.body, id: req.params.id };
    res.json(store.hosts[i]);
  });

  privateApi.get('/hubs', (req, res) => {
    const offset = Number(req.query.offset) || 0;
    const limit = req.query.limit != null ? Number(req.query.limit) : undefined;
    res.json(listPayload(store.hubs, offset, limit));
  });

  privateApi.get('/hubs/:id', (req, res) => {
    const h = store.hubs.find((x) => x.id === req.params.id);
    if (!h) return res.status(404).json({ error: 'not found' });
    res.json({ object: h });
  });

  privateApi.post('/hubs', (req, res) => {
    const body = (req.body && req.body.object) || req.body || {};
    const id = body.id || `hub-mock-${randomUUID().slice(0, 8)}`;
    const h = { id, metadata: body.metadata || {}, spec: body.spec || {}, status: body.status || {} };
    store.hubs.push(h);
    res.status(201).json({ object: h });
  });

  privateApi.put('/hubs/:id', (req, res) => {
    const i = store.hubs.findIndex((x) => x.id === req.params.id);
    if (i < 0) return res.status(404).json({ error: 'not found' });
    const body = (req.body && req.body.object) || {};
    store.hubs[i] = { ...store.hubs[i], ...body, id: req.params.id };
    res.json({ object: store.hubs[i] });
  });

  privateApi.delete('/hubs/:id', (req, res) => {
    const i = store.hubs.findIndex((x) => x.id === req.params.id);
    if (i < 0) return res.status(404).json({ error: 'not found' });
    store.hubs.splice(i, 1);
    res.status(204).end();
  });

  privateApi.get('/tenants', (req, res) => {
    const offset = Number(req.query.offset) || 0;
    const limit = req.query.limit != null ? Number(req.query.limit) : undefined;
    res.json(listPayload(store.tenants, offset, limit));
  });

  privateApi.get('/host_classes/:id', (req, res) => {
    res.json({
      id: req.params.id,
      metadata: { name: req.params.id, creation_timestamp: new Date().toISOString(), creators: ['demo'] },
      title: req.params.id,
      description: 'Mock host class from standalone API',
    });
  });

  return { fulfillment, private: privateApi };
}
