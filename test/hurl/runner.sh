# arguments:
#  FILE_OR_DIR  - optional, name of the file to run, if not provided, runs all scripts
#
# env:
#  HURL_app_host - optional, defaults to "http://localhost:5000"
#  HURL_report_dir - optional

script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

app_host="${HURL_app_host:-"http://localhost:5000"}"
report_dir="${HURL_report_dir:-""}"
test_file="${1:-"${script_dir}"}"

report_option=""
if [ -n "${report_dir}" ]; then
  report_option="--report-html ${report_dir}"
fi

echo
echo "ℹ️  Running scripts in directory $script_dir"
echo "ℹ️  app_host=${app_host}"
echo

function run_hurl() {
  local file=$1
  hurl --test ${report_option} \
       --variable app_host="${app_host}" \
        ${file}
}

if [ -z "${test_file}" ]; then
  run_hurl "${script_dir}"
else
  echo " running single test"
  run_hurl ${test_file}
fi
