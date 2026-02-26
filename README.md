\# WeTransfer1 (University Project)



A self-hosted file sharing platform inspired by WeTransfer. This project allows users to upload files, generate shareable links, and manage file expirations.



\##  Project Overview



This application is a full-stack web application built with:

\- \*\*Frontend:\*\* Next.js (React), Mantine UI

\- \*\*Backend:\*\* NestJS (Node.js)

\- \*\*Database:\*\* SQLite (managed via Prisma ORM)



\##  Prerequisites



Before running this project, ensure you have the following installed:

\- \*\*Node.js\*\* (Version 16 or higher)

\- \*\*npm\*\* (Node Package Manager)



---



\##  Installation \& Setup



Open your terminal and follow these steps to set up the project.



\### 1. Backend Setup (Server \& Database)



The backend handles the logic and database connection.



```bash

\# 1. Navigate to the backend folder

cd backend



\# 2. Install dependencies

npm install



\# 3. Setup the Configuration

\# Create a file named 'config.yaml' in the backend folder and paste the content below:

\# (See Configuration Section below)



\# 4. Initialize the Database

npx prisma db push



\# 5. Fill Database with Default Settings

npx ts-node fill-db.ts



\# 6. Navigate to the frontend folder

cd frontend



\# 7. Install dependencies

npm install



\# 8. How to run:

cd backend

npm run dev



cd frontend

npm run dev



\# Access the site via:

http://localhost:3000/

