# request-api-stub

This module provides the necessary [Wiremock](https://wiremock.org/) mappings to provide a stub implementation of 
Request API from the Data Platform [Async Request Backend](https://github.com/digital-land/async-request-backend. 

## Usage

The module is used in the request-api-stub service within the parent docker-compose.yml file.  The wiremock
directory is mapped to the /home/wiremock directory on the container.

See the [Wiremock docs](https://wiremock.org/docs/) to learn more as well as guidance on how to edit stub behaviour 
or add more stubs.
