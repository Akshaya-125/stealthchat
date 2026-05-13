# StealthChat Backend 🚀

## Overview

StealthChat is a real-time messaging backend system that supports selective message visibility, secret threads, and timed message delivery.

## Features

* Selective message visibility
* Secret threads inside groups
* Timed message reveal
* Real-time messaging with Socket.IO

## Tech Stack

* Node.js
* Express.js
* MongoDB
* Socket.IO

## Setup

1. Clone repo

2. Install dependencies:
   npm install

3. Create `.env` file:
   MONGO_URI=your_mongodb_uri
   PORT=5000
   JWT_SECRET=your_secret

4. Run server:
   npm start

## API Endpoints

### Auth

* POST /api/auth/signup
* POST /api/auth/login

### Groups

* POST /api/groups

### Messages

* POST /api/messages
* GET /api/messages/:groupId

## Author

Your Name
