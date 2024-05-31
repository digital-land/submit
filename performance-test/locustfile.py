import logging
import os
import random
import re
import socket
import time
from typing import Union

import dns.resolver
from locust import FastHttpUser
from locust import task, run_single_user, events
from locust.env import Environment
from locust.exception import RescheduleTask

from config_schema import Config, RequestTypeEnum, CheckUrlParams, CheckFileParams

config: Config


class DataProviderUser(FastHttpUser):
    host = 'https://publish.development.digital-land.info'
    protocol = "https://"
    request_id_pattern = "[2-9A-HJ-NP-Za-km-z]{22}"
    default_headers = {
        "Accept": 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,'
                  'application/signed-exchange;v=b3;q=0.7',
        "Connection": "keep-alive",
        "User-Agent": 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) '
                      'Chrome/123.0.0.0 Safari/537.36'
    }

    @task
    def check_datafile(self):
        params = config.journey_parameters[random.randint(0, len(config.journey_parameters) - 1)]
        # self.host_ip_address = self._lookup_host_ip()

        self._visit_start_page()
        time.sleep(self._user_think_time())

        self._select_dataset(params)
        time.sleep(self._user_think_time())

        if params.geom_type:
            self._select_geometry_type(params)
            time.sleep(self._user_think_time())

        self._select_upload_method(params)
        time.sleep(self._user_think_time())

        submit_response = self._submit_check_request(params)
        time.sleep(self._user_think_time())

        request_id = self._extract_request_id(params, submit_response)
        logging.info(f"Got request id: {request_id}, for params: {params}")

        self._get(path=f"/status/{request_id}", name="/status/[request_id]")
        time.sleep(3)
        result = self._poll_for_completion(request_id)
        logging.info(f"Request with id: {request_id}, got status: {result.json().get('status')}")

        if result.json().get('status') == "COMPLETE":
            self._get(path=f"/results/{request_id}/0", name="/results/[request_id]")

    def _visit_start_page(self):
        return self._get(path='/')

    def _select_dataset(self, params: Union[CheckUrlParams, CheckFileParams]):
        self._get(path='/dataset')
        time.sleep(self._user_think_time())
        dataset_selection_response = self._form_post(
            path="/dataset",
            data=f"dataset={params.dataset}"
        )
        _handle_error_response(dataset_selection_response, "selection of dataset")
        return dataset_selection_response;

    def _select_geometry_type(self, params: Union[CheckUrlParams, CheckFileParams]):
        geom_type_response = self._form_post(
            path="/geometry-type",
            data=f"geomType={params.geom_type}"
        )
        _handle_error_response(geom_type_response, "selection of geometry type")

    def _select_upload_method(self, params: Union[CheckUrlParams, CheckFileParams]):
        time.sleep(self._user_think_time())
        upload_method = 'file' if params.type == RequestTypeEnum.check_file else 'url'
        upload_method_response = self._form_post(
            path="/upload-method",
            data=f"upload-method={upload_method}"
        )
        _handle_error_response(upload_method_response, "selection of upload method")

    def _submit_check_request(self, params):
        if params.type == RequestTypeEnum.check_file:
            with open(params.file_path, 'rb') as file:
                basename = os.path.basename(params.file_path)
                files = [
                    ('datafile', (basename, file, params.mime_type))
                ]
                return self._file_post(path="/upload", files=files)
        else:
            return self._form_post(
                path="/url",
                data=f"url={params.url}"
            )
        _handle_error_response(submit_response, "submission of check request")

    def _extract_request_id(self, params, submit_response):
        request_id = submit_response.url[submit_response.url.rfind('/') + 1:]
        if not re.search(self.request_id_pattern, request_id):
            error = f"Did not get valid request id: {request_id}, for params: {params}"
            logging.error(error)
            raise RescheduleTask(error)
        return request_id

    def _get(self, path, headers=default_headers, name=None):
        request_headers = headers | {"Content-Type": "application/x-www-form-urlencoded"} | {"Host": self._domain()}
        return self.client.request(
            "GET",
            path,
            headers=request_headers,
            name=name
        )

    def _form_post(self, path, headers=default_headers, data=None, files=None, name=None):
        request_headers = headers | {"Content-Type": "application/x-www-form-urlencoded"} | {"Host": self._domain()}
        return self.client.request(
            "POST",
            path,
            headers=request_headers,
            data=data,
            files=files,
            name=name
        )

    def _file_post(self, path, headers=default_headers, data=None, files=None, name=None):
        request_headers = headers | {"Content-Type": "application/x-www-form-urlencoded"} | {"Host": self._domain()}
        return self.client.request(
            "POST",
            path,
            headers=request_headers,
            data=data,
            files=files,
            name=name
        )

    def _poll_for_completion(self, request_id, statuses=['COMPLETE', 'FAILED'], wait_seconds=3, timeout_seconds=900):
        seconds_waited = 0
        while seconds_waited < timeout_seconds:
            response = self._get(path=f"/api/status/{request_id}", name="/api/status/[request_id]")
            if response.ok and response.json().get('status') in statuses:
                return response
            else:
                time.sleep(wait_seconds)
                seconds_waited += wait_seconds
            if seconds_waited == timeout_seconds:
                raise Exception(f"Timeout of {timeout_seconds} seconds exceeded waiting for status to be complete or "
                                f"failed")

    def _user_think_time(self, min=3, max=5):
        return random.randint(min, max)

    def _domain(self): return self.host.replace(self.protocol, "")


@events.init.add_listener
def on_locust_init(environment: Environment, **kwargs):
    logging.info(f"on_locust_init called - loading config file")
    with open("config.json") as configfile:
        global config
        config = Config.model_validate_json(configfile.read())


@events.request.add_listener
def my_request_handler(request_type, name, response_time, response_length, response,
                       context, exception, start_time, url, **kwargs):
    if exception:
        print(f"Request to {name} failed with exception {exception}.  Response headers: {response.headers}")
    # else:
    #     print(f"Successfully made a request to: {name}")
    #     print(f"The response was {response.text}")


def _handle_error_response(response, action_description):
    if not response.ok:
        error = (f"Unsuccessful response upon ${action_description}, got status code "
                 f"{response.status_code} with body "
                 f"{response.content}")
        logging.error(error)
        raise RescheduleTask(error)


# Decorate python built-in DNS resolver
# Fresh DNS lookup and randomised selection of IP is important when load testing against CloudFront-ed service
# See https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/load-testing.html
# See https://stackoverflow.com/questions/74734581/how-to-make-locust-respect-dns-ttl
def custom_dns_resolver(builtin_resolver):
    target_hosts = ["publish.development.digital-land.info", "publish.staging.digital-land.info", "publish.planning.data.gov.uk"]

    # Perform A record lookup and select first address
    # AWS/Route 53
    def _lookup_host_ip(self):
        answer = dns.resolver.resolve(self.domain, 'A')
        return answer[0].address

    def getaddrinfo_wrapper(*args, **kwargs):
        print(f"getaddrinfo_wrapper: {args[:2]}")
        if args[:2] in target_hosts:
            ip = _lookup_host_ip(args[:2])
            return ip
        else:
            # fall back to builtin_resolver for endpoints not in etc_hosts
            return builtin_resolver(*args, **kwargs)

    return getaddrinfo_wrapper


if os.environ.get("USE_CUSTOM_DNS_RESOLVER", "True") == "True":
    # monkey patch socket.getaddrinfo
    socket.getaddrinfo = custom_dns_resolver(socket.getaddrinfo)

if __name__ == "__main__":
    run_single_user(DataProviderUser)
