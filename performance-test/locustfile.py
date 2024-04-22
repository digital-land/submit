import os
import random
import time
import logging

from locust import task, run_single_user, events
from locust import FastHttpUser
from locust.env import Environment
from locust.exception import RescheduleTask

from config_schema import Config, RequestTypeEnum

config: Config


@events.init.add_listener
def on_locust_init(environment: Environment, **kwargs):
    logging.info(f"on_locust_init called - loading config file")
    with open("config.json") as configfile:
        global config
        config = Config.model_validate_json(configfile.read())


def _handle_error_response(response, action_description):
    if not response.ok:
        error = (f"Unsuccessful response upon ${action_description}, got status code "
                 f"{response.status_code} with body "
                 f"{response.content}")
        logging.error(error)
        raise RescheduleTask(error)


class DataProviderUser(FastHttpUser):

    host = 'https://publish.development.digital-land.info'
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
        self._get(url='/')
        time.sleep(self._user_think_time())
        # connect_sid_cookie = list(filter(lambda c: c.name == 'connect.sid', self.client.cookiejar))[0]
        # print(f"Journey started for session: {connect_sid_cookie.value}")
        self._get(url='/dataset')
        time.sleep(self._user_think_time())
        dataset_selection_response = self._form_post(
            url="/dataset",
            data=f"dataset={params.dataset}"
        )
        _handle_error_response(dataset_selection_response, "selection of dataset")

        if params.geom_type:
            time.sleep(self._user_think_time())
            geom_type_response = self._form_post(
                url="/geometry-type",
                data=f"geomType={params.geom_type}"
            )
            _handle_error_response(geom_type_response, "selection of geometry type")

        time.sleep(self._user_think_time())
        upload_method = 'file' if params.type == RequestTypeEnum.check_file else 'url'
        upload_method_response = self._form_post(
            url="/upload-method",
            data=f"upload-method={upload_method}"
        )
        _handle_error_response(upload_method_response, "selection of upload method")

        time.sleep(self._user_think_time(min=6, max=15))
        submit_response = self.submit_check_request(params)
        _handle_error_response(submit_response, "submission of check request")

        request_id = submit_response.url[submit_response.url.rfind('/')+1:]
        logging.info(f"Got request id: {request_id}, for params: {params}")

        self._get(url=f"/status/{request_id}", name="/status/[request_id]")
        result = self._poll_for_completion(request_id)
        logging.info(f"Request with id: {request_id}, got status: {result.json().get('status')}")
        self._get(url=f"/results/{request_id}", name="/results/[request_id]"),
        # print(f"Journey complete for session: {connect_sid_cookie.value}")
        self.client.cookiejar.clear()

    def submit_check_request(self, params):
        if params.type == RequestTypeEnum.check_file:
            with open(params.file_path, 'rb') as file:
                basename = os.path.basename(params.file_path)
                files = [
                    ('datafile', (basename, file, params.mime_type))
                ]
                return self._file_post(url="/upload", files=files)
        else:
            return self._form_post(
                url="/url",
                data=f"url={params.url}"
            )

    def _get(self, url, headers=default_headers, name=None):
        return self.client.request(
                "GET",
                url,
                headers=headers,
                name=name
        )

    def _form_post(self, url, headers=default_headers, data=None, files=None, name=None):
        return self.client.request(
                "POST",
                url,
                headers=headers | {"Content-Type": "application/x-www-form-urlencoded"},
                data=data,
                files=files,
                name=name
        )

    def _file_post(self, url, headers=default_headers, data=None, files=None, name=None):
        return self.client.request(
                "POST",
                url,
                headers=headers | {"Content-Type": "multipart/form-data"},
                data=data,
                files=files,
                name=name
        )

    def _poll_for_completion(self, request_id, statuses=['COMPLETE', 'FAILED'], wait_seconds=3, timeout_seconds=900):
        seconds_waited = 0
        while seconds_waited < timeout_seconds:
            response = self._get(url=f"/api/status/{request_id}", name="/api/status/[request_id]")
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


if __name__ == "__main__":
    run_single_user(DataProviderUser)
