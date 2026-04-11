# Movie Ticket Booking System

A comprehensive, full-stack movie ticket booking application designed to provide a seamless booking experience for users and a robust management system for administrators.

## 🚀 Features

### User Features
-   **User Authentication**: Secure login and registration using JWT and Google OAuth.
-   **Movie Browsing**: Browse currently showing and upcoming movies.
-   **Seat Selection**: Interactive seat map for choosing seats.
-   **Booking & Payment**: Secure booking process with payment integration (Momo, ZaloPay support implied by codebase).
-   **Ticket Management**: View booking history and QR codes for ticket verification.
-   **Real-time Updates**: WebSocket integration for real-time seat availability.

### Admin Features
-   **Dashboard**: Visual analytics using charts (Recharts) for revenue and booking statistics.
-   **Movie Management**: Add, update, and remove movies.
-   **Schedule Management**: Manage showtimes and theaters.
-   **Export Data**: Export booking data to Excel.
-   **Business Rules**: Dynamic pricing and rules using Drools.

## 🛠 Tech Stack

### Backend
-   **Framework**: Spring Boot 3.5.7
-   **Language**: Java 17
-   **Database**: MySQL
-   **Security**: Spring Security, JWT
-   **Real-time**: WebSocket (STOMP)
-   **Tools**: Lombok, Maven
-   **Integrations**: 
    -   Cloudinary (Image Storage)
    -   Google OAuth
    -   JavaMail (OTP/Notifications)
    -   Drools (Business Logic)
    -   ZXing (QR Code Generation)

### Frontend
-   **Framework**: React 19
-   **Build Tool**: Vite
-   **Styling**: Tailwind CSS
-   **Routing**: React Router DOM
-   **State/API**: Axios
-   **Real-time**: SockJS, STOMP
-   **Visualization**: Recharts
-   **Utilities**: ExcelJS, XLSX, QRCode.react

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
-   **Java JDK 17** or higher
-   **Node.js** (v18 or higher recommended) and **npm**
-   **MySQL** Server

## ⚙️ Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd MovieTicketBooking
```

### 2. Backend Setup
1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Configure the database:
    -   Create a MySQL database (e.g., `movie_booking_db`).
    -   Update `src/main/resources/application.properties` with your database credentials.
3.  Run the application:
    ```bash
    ./mvnw spring-boot:run
    ```
    The backend server will start on `http://localhost:8080` (default).

### 3. Frontend Setup
1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
    The frontend application will run on `http://localhost:5173` (default).

## 🔧 Environment Variables

You may need to configure environment variables or `application.properties` for third-party services:

**Backend (`application.properties`):**
-   `spring.datasource.url`, `username`, `password`
-   `spring.mail.*` (SMTP settings)
-   `cloudinary.*` (Cloudinary credentials)
-   `google.client.id`, `google.client.secret` (OAuth)

**Frontend (`.env`):**
-   `VITE_API_BASE_URL` (Pointer to backend API)
