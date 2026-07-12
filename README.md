# Service Tomorrow (Backend)

Welcome to the backend component of **Service Tomorrow**, an ITSM (IT Service Management) application. This backend is built using **Deno** and connects to a **MySQL** database. It provides RESTful APIs to manage users, support tickets (incidents), ticket comments, and CMDB assets.

---

## 🛠️ Prerequisites

Ensure you have the following installed on your system:
- **[Deno](https://deno.com/)** (v1.30 or newer recommended)
- **[Docker](https://www.docker.com/)** and **Docker Compose** (for spinning up the local MySQL database)

---

## 🚀 Installation & Setup

1. **Clone the repository and navigate to the root directory.**
2. **Environment Variables**: The project expects `dev.env` (for development/testing) and `prod.env` (for production) in the root directory. Create them if they do not exist.
   
   Example `dev.env`:
   ```env
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=my_secure_root_password
   DB_NAME=db_dev_service_tomorrow
   ```

3. **Start the Database**:
   Spin up the local MySQL database container using Docker Compose:
   ```bash
   deno task db:up
   ```

4. **Initialize Database Schema**:
   Run the database setup script to create the required tables (`users`, `tickets`, `comment`, `cmdb`):
   ```bash
   deno task db:setup
   ```

---

## 💻 Running the Application

Deno handles task execution defined in `deno.json`. Use the following commands to run the application:

### Development Mode
Runs the server with file watching enabled. It automatically uses `dev.env`.
```bash
deno task dev
```

### Production Mode
Runs the server without file watching, using `prod.env`.
```bash
deno task prod
```

### Database Management
- **`deno task db:up`**: Starts the MySQL Docker container.
- **`deno task db:down`**: Stops the MySQL Docker container.
- **`deno task db:reset`**: Tears down the container and destroys the local database volumes (removes all data).
- **`deno task db:setup`**: Initializes the database schema.

### Testing
Run tests against your development database environment:
```bash
deno task test:dev
```

---

## 📚 API Documentation

By default, the server runs on `http://localhost:8000` (depending on your Deno setup). The API consumes and produces `application/json`.

### 1. General
- **`GET /api`**: Health check endpoint.

### 2. User API
Endpoints for managing ITSM users, admins, and engineers.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/users` | Get all active users. Supports query params `?username=` and `?email=`. |
| `POST` | `/api/users` | Create a new user. Body: `{ username, password?, first_name, last_name, email, phone_number?, role }` |
| `GET` | `/api/users/:id` | Get a specific user by ID. |
| `PATCH` | `/api/users/:id` | Update general user details. Body: `{ first_name?, last_name?, phone_number?, password? }` |
| `PATCH` | `/api/users/:id/role`| Update user role. Body: `{ role }` |
| `POST` | `/api/users/:id/activate` | Activate a deactivated user. |
| `POST` | `/api/users/:id/deactivate` | Deactivate an active user. |
| `DELETE`| `/api/users/:id` | Soft delete a user. |
| `POST` | `/api/users/:id/restore`| Restore a soft-deleted user. |

### 3. Ticket API
Endpoints for managing support tickets (Incidents).

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/tickets` | Get all tickets. Supports query params `?status=`, `?assignee_id=`, and `?creator_id=`. |
| `POST` | `/api/tickets` | Create a ticket. Body: `{ inc_number, created_by, short_description, long_description?, priority? }` |
| `GET` | `/api/tickets/:id` | Get a specific ticket by ID. |
| `GET` | `/api/tickets/inc/:inc` | Get a ticket by its Incident Number (e.g., `INC0001`). |
| `PATCH` | `/api/tickets/:id` | Update ticket details. Body: `{ short_description?, long_description?, priority? }` |
| `PATCH` | `/api/tickets/:id/status`| Update ticket status. Body: `{ status, closing_note? }` |
| `POST` | `/api/tickets/:id/assign` | Assign ticket to user. Body: `{ user_id }` |
| `POST` | `/api/tickets/:id/unassign`| Remove ticket assignee. |
| `DELETE`| `/api/tickets/:id` | Soft delete a ticket. |
| `POST` | `/api/tickets/:id/restore`| Restore a soft-deleted ticket. |

### 4. Comment API
Endpoints for managing interactions within tickets.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/tickets/:id/comments` | Retrieve all comments for a specific ticket ID. |
| `POST` | `/api/tickets/:id/comments` | Add a new comment to a ticket. Body: `{ user_id, message }` |
| `DELETE`| `/api/comments/:id` | Soft delete a specific comment by comment ID. |

### 5. CMDB API
Endpoints for managing CMDB assets.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/cmdb` | Get all assets. Supports dynamic query params for any field (e.g., `?ip_address=`, `?asset_name=`). |
| `POST` | `/api/cmdb` | Create a new asset. Body: `{ asset_name, host_name?, ip_address?, mac_address?, os_version?, is_virtual?, spoc?, description?, is_operational? }` |
| `GET` | `/api/cmdb/:id` | Get a specific asset by ID. |
| `PATCH` | `/api/cmdb/:id` | Update asset details. Body: `{ asset_name?, ip_address?, ... }` |
| `DELETE`| `/api/cmdb/:id` | Soft delete an asset. |
| `POST` | `/api/cmdb/:id/restore`| Restore a soft-deleted asset. |
