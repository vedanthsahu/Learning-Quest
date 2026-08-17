## 36. IoT Core

> **Decision Snapshot** — Tier 3 · Reference Level · Verdict: know it exists as the managed entry point for connecting and managing large fleets of IoT devices — relevant specifically to IoT-focused architectures, not a general-purpose service most backend engineers reach for.

### What It Does
IoT Core provides device connectivity (MQTT and other IoT protocols) at scale, a device registry and "shadow" (a persisted, synced representation of a device's last-known state, even while offline), and rules-based routing of device messages to other AWS services (Lambda, Kinesis, S3) for processing.

### When to Reach for It
Any architecture connecting and managing a fleet of physical IoT devices needing secure connectivity, per-device identity/certificates, and routing of telemetry into your broader AWS-based processing pipeline.

### When to Avoid It
Non-IoT workloads entirely — this service solves a specific, device-fleet-connectivity problem and has no general-purpose backend use case outside that domain.

### One Architecture Diagram
```
IoT Devices (MQTT) → IoT Core (device registry, device shadow, rules engine)
                              ↓ (rule: route by message type)
                    Kinesis (real-time) / Lambda (processing) / S3 (archival)
```

### Interview Questions
1. What's a device shadow, and what problem does it solve for intermittently-connected devices?
2. How does IoT Core's rules engine route incoming device messages to other AWS services?

### Cloud-Agnostic Mapping
IoT Core (AWS) ≈ Azure IoT Hub (Azure) ≈ Cloud IoT Core (GCP, note: GCP deprecated its native offering in favor of partner solutions — worth confirming current status if this is a live requirement).

---
