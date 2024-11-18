# Submit and update planning and housing data for England

Project is a web application for validating and submitting planning and housing data for England.

# Dependencies

Below is a list of dependencies needed to develop, run and deploy the application.

<!-- TEMPLATE -->
<!--div class="" data-type="Dependency">
  Dependencies have the following format:
  <pre>
  - Dependency Name : string
    - Description: string // a sentence or two
    - Used for: string    // a sentence or two
    - Contact: string?     // email or username or full name of person responsible
  </pre>
</div -->

## Services

- AWS
    - **Description**: Various cloud infrastructure products
    - **Used for**: Running the application and associated services.
    - **Contact**: Infrastructure Team @ MHCLG
- Redis
    - **Description**: An in memory key-value store
    - **Used for**: storing session information
    - **Contact**: Infrastructure Team @ MHCLG
- [Local Authorities API](https://github.com/digital-land/async-request-backend) (external dependency)
    - **Description**: asynchronous request processing for frontends
    - **Used for**: Processing user submitted data
    - **Contact**: Infrastructure Team @ MHCLG

## API Keys/Secrets

- Github
    - **Description**: Source code hosting
    - **Used for**: Storing the code and as a dependency source of internal packages.
    - **Contact**: Infrastructure Team @ MHCLG
- [Smartlook](https://smartlook.com)
    - **Description**: Web Analytics
    - **Used for**: Collecting _anonymised_ data on website usage
    - **Contact**: Providers team @ MHCLG
- [Sentry](https://sentry.io)
    - **Description**: Application monitoring service
    - **Used for**: Monotoring warnings and errors.
    - **Contact**: Infrastructure Team @ MHCLG
- [Google Analytics](https://analytics.google.com/analytics)
    - **Description**: Web Analytics
    - **Used for**: Collecting data on website usage
    - **Contact**: Providers team @ MHCLG

## Software

- Nodejs
    - **Description**: JS runtime
    - **Used for**: running the web application
- Wiremock
    - **Description**: Tool for mocking APIs. Allows to serve pre-baked data from a file/directory.
- Docker (for development)
    - **Description**: Container runtime
    - **Used for**: Running Redis and localstack/testcontainers
- [GOV.UK Design System](https://design-system.service.gov.uk/)
    - **Description**: Design System
    - **Used for**: Making the UI consistent with other government services.

## Setup

- Install the node packages
    ```
    npm install
    ```
- setup husky pre-commit hooks
    ```
    npm run prepare
    ```
- compile scss file
    ```
    npm run scss
    ```

## Running the application

The application picks up one of the configs in `config` directory,
depeding on `NODE_ENV` environment variable (set to 'production' by default).

You can start the appliction in one fo the following ways (see "scripts" section
of [package.json](package.json)) for more examples.

- Run the application
    ```
    npm run start
    ```
- Run the application, using a local API
    ```
    npm run start:local
    ```
- Run the application, using a local API in watch mode
    ```
    npm run start:local:watch
    ```
- Run the application using docker
    ```
    docker-compose -f docker-compose-real-backend.yml up
    ```
- Run the application (without the frontend) using docker
    ```
    docker-compose -f docker-compose-real-backend-minus-frontend.yml up
    ```
- Run external services in containers and start application
    ```
    npm run dev
    ```

### Mac users only

If you are a Mac user, please note that port 5000 is used by AirPlay Receiver. In order to use the application, you will need to switch off AirPlay Receiver
or update your local config to use a different port.

To switch off AirPlay Receiver, follow these steps:
1. Open System Preferences on your Mac.
2. Search for "AirDrop & Handoff".
3. In the "AirPlay Receiver" toggle, select "Off".

Once you have switched off AirPlay Receiver, you should be able to use the application without any issues.
