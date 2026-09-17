# Collaborative Document Engine

A full-stack, real-time collaborative document editing platform built with Django, React, Django Channels, WebSockets, Redis, and PostgreSQL. Completely containerized using Docker Compose.

---

## Key Features

* **Real-Time Collaboration:** Instant bidirectional document synchronization across multiple users via WebSockets.
* **RESTful API Backend:** Django REST Framework endpoints for managing documents, user profiles, and permissions.
* **Authentication & Security:** JWT authentication with custom DRF permission controls (`AllowAny`, `IsAuthenticated`).
* **Asynchronous Server:** Powered by Daphne ASGI server and Redis Channel Layers for scalable WebSocket management.
* **Full Containerization:** Automated local development environment using Docker Compose for backend, frontend, database, and cache services.

---

## Tech Stack

| Domain | Technologies |
| :--- | :--- |
| **Frontend** | React, TypeScript, HTML5/CSS3 |
| **Backend** | Python 3, Django, Django REST Framework (DRF) |
| **Real-Time** | Django Channels, WebSockets, Daphne (ASGI) |
| **Database & Cache** | PostgreSQL, Redis |
| **DevOps & Tooling** | Docker, Docker Compose, Git/GitHub |

---

## Architecture Overview

```text
               +-----------------------+
               |     React Client      |
               +-----------+-----------+
                           |
            +--------------+--------------+
            |                             |
      HTTP / REST                     WebSockets
            |                             |
            v                             v
   +-----------------+           +-----------------+
   |  Django WSGI    |           |  Daphne ASGI    |
   | (DRF API Endpt) |           | (Django Channels|
   +--------+--------+           +--------+--------+
            |                             |
            +--------------+--------------+
                           |
            +--------------+--------------+
            |                             |
            v                             v
   +-----------------+           +-----------------+
   |   PostgreSQL    |           |  Redis Channel  |
   |   (Database)    |           |     Layer       |
   +-----------------+           +-----------------+

```
## Execution & Setup Guide

### Option 1: Running with Docker Compose (Recommended)

This is the fastest way to spin up the entire stack (React, Django REST API, Daphne ASGI, PostgreSQL, and Redis).

#### 1. Clone the Repository
```bash
git clone [https://github.com/bhavesh7reddy/Collaborative-Document-Engine.git](https://github.com/bhavesh7reddy/Collaborative-Document-Engine.git)
cd Collaborative-Document-Engine
