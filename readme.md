# Submit and update planning and housing data for England

Project is a web application for validating and submitting planning and housing data for England.

## Code Documentation

https://digital-land.github.io/submit/

## Dependencies

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
    docker compose -f docker-compose-real-backend.yml up
    ```
- Run the application (without the frontend) using docker
    ```
    docker compose -f docker-compose-real-backend-minus-frontend.yml up
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

## Jira Integration (for local development)

The application has a Jira integration that allows you to create and update Jira issues from the application.
Most of this code is in the `src/services/jiraService.js` file.

Prerequisites:
- A Jira Service Desk instance
- A Jira user with the following permissions:
    - Create issues in the Jira Service Desk
    - Edit issues in the Jira Service Desk
    - View issues in the Jira Service Desk

### Generating the Jira basic auth credentials

```
echo -n user@example.com:api_token_string | base64
```

You can read more about JIRA Basic Auth [here](https://developer.atlassian.com/cloud/jira/platform/basic-auth-for-rest-apis/).

API keys can be generated [here](https://id.atlassian.com/manage-profile/security/api-tokens).

### How to enable Jira integration

1. Go to the .env file
2. Add the following variables:

```
JIRA_URL=your_jira_url
JIRA_BASIC_AUTH=your_jira_basic_auth
JIRA_SERVICE_DESK_ID=your_jira_service_desk_id
```

or do the following:

Warning: This will overwrite your existing .env file.

```
cp .env.example .env
```

Then edit the .env file with the correct values.

### How to create a test Jira Service Desk for local development

Ideally use the Jira Sandbox URL, this only requires the three env parameters for JIRA to be filled in, The JIRA_BASIC_AUTH and JIRA_SERVICE_DESK_ID are the same as the production environment, only the URL needs to be changed to use the Sandbox Jira environment.

#### Alternative Local Spinup

1. Go to [JIRA Service Desk](https://www.atlassian.com/software/jira/service-desk/try)
2. Click on Try for free and "Create a 'Customer Desk' Project"
3. Fill in the form and create a test instance
4. In the "Users" section, create a new user
5. In the "Projects" section, create a new project
6. In the "Service Desk" section, create a new service desk - get the service desk ID (this is the `JIRA_SERVICE_DESK_ID` env variable)
7. Get an API key for the new user, this can be found in the user's profile page
8. Get the Jira URL (this is the `JIRA_URL` env variable)
9. Generate the Jira basic auth credentials (this is the `JIRA_BASIC_AUTH` env variable). This is the username and password of the new user, separated by a colon then encoded in base64.
