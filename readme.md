# Submit and update planning and housing data for England

Project is a web application for validating and submitting planning and housing data for England.

The service does two related things. **Checking** validates a URL or uploaded file against a dataset
specification and reports what is wrong, nothing is committed, and the user is under no obligation
to go further. **Providing** takes a URL that has passed a check and raises a request with the data
team so the endpoint is collected by the pipeline. Alongside those, the service publishes data
quality dashboards for local planning authorities.

## Code Documentation

Generated API reference and guides: **https://digital-land.github.io/submit/**

| Guide | Covers |
|---|---|
| [Architecture](https://digital-land.github.io/submit/tutorial-architecture.html) | boot sequence, routes, form wizards, error handling, config, testing |
| [Middleware guidelines](https://digital-land.github.io/submit/tutorial-middleware-guidelines.html) | conventions and builder reference — read before adding a route |
| [Check data](https://digital-land.github.io/submit/tutorial-check-data.html) | the check wizard, async request lifecycle, URL failure modes |
| [Submit data](https://digital-land.github.io/submit/tutorial-submit-data.html) | the provide wizard, Jira submission |
| [Review data quality](https://digital-land.github.io/submit/tutorial-review-data-quality.html) | the `/organisations` dashboards and their middleware chains |
| [Get started and deep links](https://digital-land.github.io/submit/tutorial-get-started.html) | the get-started page and deep links into the check tool |
| [Dependencies](https://digital-land.github.io/submit/tutorial-dependencies.html) | services, external systems, datasette, Digital Land repos |

Sources live in [docs/](docs) and are published as tutorials by `npm run generate:docs`.

## Architecture at a glance

The app is an Express server rendering nunjucks templates, assembled in
[index.js](index.js) by one module per concern from [src/serverSetup/](src/serverSetup):
`setupMiddlewares`, `setupSession`, `setupNunjucks`, `setupRoutes`, `setupSentry`,
`setupErrorHandlers`. Two datasette-backed filter initialisers are awaited before the app is built,
so a boot failure there is deliberate rather than a page with missing names.

| Mount | Router | Guide |
|---|---|---|
| `/` | `routes/manage.js` | — landing page |
| `/check` | `routes/form-wizard/check/` | [Check data](https://digital-land.github.io/submit/tutorial-check-data.html) |
| `/submit` | `routes/form-wizard/endpoint-submission-form/` | [Submit data](https://digital-land.github.io/submit/tutorial-submit-data.html) |
| `/organisations` | `routes/organisations.js` | [Review data quality](https://digital-land.github.io/submit/tutorial-review-data-quality.html) |
| `/api` | `routes/api.js` | status polling for the check status page |
| `/health` | `routes/health.js` | dependency status |
| `/guidance` | `routes/guidance.js` | 302 to planning.data.gov.uk |
| `/community`, `/extract`, `/accessibility`, `/privacy-notice`, `/cookies` | one router each | static pages |

```
src/
├── serverSetup/   # app assembly, one module per concern
├── routes/        # express routers, form wizard definitions, template schemas
├── controllers/   # form wizard step controllers (PageController subclasses)
├── middleware/    # middleware chains, one file per page, plus shared builders
├── services/      # clients for external systems
├── models/        # wrappers over async request API payloads
├── filters/       # nunjucks filters
├── utils/         # helpers, datasette queries, logging, validators
├── views/         # nunjucks templates
├── content/       # long-form copy used in templates
└── assets/        # scss, client-side js, static images
```

Pages are built as chains of small middleware functions — see
[Middleware guidelines](https://digital-land.github.io/submit/tutorial-middleware-guidelines.html)
before adding a route.

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

### How to enable Jira integration

1. Go to the .env file
2. Add the following variables:

```
JIRA_URL=your_jira_url
JIRA_API_KEY=your_jira_api_key
JIRA_SERVICE_DESK_ID=your_jira_service_desk_id
```

or do the following:

Warning: This will overwrite your existing .env file.

```
cp .env.example .env
```

Then edit the .env file with the correct values.

### How to test Jira Service Desk for local development

If testing in local, dev or staging, the same keys as production are to be used, it should attach [TEST] to the title of the created jira tickets.