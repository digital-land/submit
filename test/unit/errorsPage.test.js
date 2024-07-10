import { describe, it, expect } from 'vitest'
import RequestData from '../../src/models/requestData.js'

import nunjucks from 'nunjucks'
import addFilters from '../../src/filters/filters'

import errorResponse from '../../docker/request-api-stub/wiremock/__files/check_file/article-4/request-complete-errors.json'
import errorResponseDetails from '../../docker/request-api-stub/wiremock/__files/check_file/article-4/request-complete-errors-details.json'
import ResponseDetails from '../../src/models/responseDetails.js'
import paginationTemplateTests from './paginationTemplateTests.js'

const nunjucksEnv = nunjucks.configure([
  'src/views',
  'src/views/check',
  'src/views/submit',
  'node_modules/govuk-frontend/dist/',
  'node_modules/@x-govuk/govuk-prototype-components/'
], {
  dev: true,
  noCache: true,
  watch: true
})

addFilters(nunjucksEnv, { dataSubjects: {} })

describe('errors page', () => {
  it('renders the correct number of errors', () => {
    const requestData = new RequestData(errorResponse)

    const responseDetails = new ResponseDetails('id', errorResponseDetails, { totalResults: 3, offset: 0, limit: 50 }, requestData.getColumnFieldLog())

    requestData.response.pagination = {
      totalResults: 100,
      offset: 0,
      limit: 50
    }

    const params = {
      options: {
        requestParams: requestData.getParams(),
        errorSummary: requestData.getErrorSummary(),
        rows: responseDetails.getRows(),
        columns: responseDetails.getColumns(),
        fields: responseDetails.getFields(),
        mappings: responseDetails.getFieldMappings(),
        verboseRows: responseDetails.getRowsWithVerboseColumns(),
        pagination: responseDetails.getPagination(0)
      }
    }

    const html = nunjucks.render('results/errors.html', params).replace(/(\r\n|\n|\r)/gm, '').replace(/\t/gm, '').replace(/\s+/g, ' ')

    // error summary
    expect(html).toContain('<ul class="govuk-list govuk-list--bullet"> <li> 1 geometry must be in Well-Known Text (WKT) format </li> <li> 1 documentation URL must be a real URL </li> <li> 1 entry date must be today or in the past </li> <li> 1 start date must be a real date </li> <li> 1 geometry missing </li> <li> Reference column missing </li> </ul> ')
    // table headers
    expect(html).toContain('<thead class="govuk-table__head"> <tr class="govuk-table__row"> <th scope="col" class="govuk-table__header">id</th> <th scope="col" class="govuk-table__header">wkt</th> <th scope="col" class="govuk-table__header">name</th> <th scope="col" class="govuk-table__header">Layer</th> <th scope="col" class="govuk-table__header">area(ha)</th> <th scope="col" class="govuk-table__header">entry-date</th> <th scope="col" class="govuk-table__header">start-date</th> <th scope="col" class="govuk-table__header">documentation-url</th> </tr> </thead>')

    // table rows
    expect(html).toContain('<tr class="govuk-table__row"> <td class="govuk-table__cell app-wrap"> 4 </td> <td class="govuk-table__cell app-wrap"> <div class="govuk-inset-text app-inset-text---error"> <p class="app-inset-text__value">POLYGON ((-0.2 4153471441223381 51.64678234555299,-0.24153451533341586 51.64678375436429,-0.24153402837267088 51.646785131884954,-0.24153328311827696 51.64678646057366,-0.2415322658196911 51.64678772223974,-0.24153100606519867 51.6467888993419,-0.24152951934469136 51.64678996513527,-0.24152782080019092 51.64679090186209,-0.241525953770536 51.646791710171776,-0.24152394853978726 51.646792354548786,-0.241521819206364 51.64679284419671,-0.24151960980486648 51.64679316179073,-0.241517349227872 51.646793307763815,-0.24151508116211567 51.64679327377821,-0.24151283450017486 51.64679306026688,-0.24151065223303 51.64679267686634,-0.24150856325325645 51.64679212400957,-0.2415066102039489 51.646791420320184,-0.24150480787927503 51.64679055702751,-0.24150318378028418 51.64678957051299,-0.24150178124580876 51.64678846142601,-0.2415006140263633 51.64678724795729,-0.24149969552458145 51.64678595728458,-0.24149905393724236 51.646784607815064,-0.2414986741222941 51.64678321730649,-0.24149859872278576 51.64678180438247,-0.24149878335623448 51.64678039535491,-0.24149927031780533 51.64677901783456,-0.24150001557289963 51.646777689146184,-0.24150103287201724 51.64677642748049,-0.24150229262683906 51.64677525037871,-0.24150377934745013 51.64677418458572,-0.24150547789181703 51.64677324785923,-0.24150734457324669 51.64677244853694,-0.24150935015132094 51.64677179517301,-0.24151147948402624 51.64677130552519,-0.2415136888846846 51.64677098793116,-0.24151594911289265 51.646770850945124,-0.2415182171777299 51.64677088493055,-0.24152046418667236 51.64677108945449,-0.24152264645304639 51.64677147285469,-0.24152473543219838 51.6467720257111,-0.24152668813319955 51.64677273838721,-0.24152849080553268 51.64677359269237,-0.2415301149045335 51.64677457920655,-0.24153151743925044 51.64677568829322,-0.2415326846591531 51.646776901761726,-0.24153360316157546 51.64677819243428,-0.24153424474969987 51.64677954190374,-0.24153462456552752 51.64678093241235,-0.24153471441223381 51.64678234555299))</p> <p class="app-inset-text__error">Geometry must be in Well Known Text (WKT) format</p></div> </td> <td class="govuk-table__cell app-wrap"> South Jesmond </td> <td class="govuk-table__cell app-wrap"> Conservation Area </td> <td class="govuk-table__cell app-wrap"> 35.4 </td> <td class="govuk-table__cell app-wrap"> <div class="govuk-inset-text app-inset-text---error"> <p class="app-inset-text__value">04/04/2025</p> <p class="app-inset-text__error">Entry date must be today or in the past</p></div> </td> <td class="govuk-table__cell app-wrap"> 04/04/2024 </td> <td class="govuk-table__cell app-wrap"> <div class="govuk-inset-text app-inset-text---error"> <p class="app-inset-text__value">www. example.com</p> <p class="app-inset-text__error">Documentation URL must be a real URL</p></div> </td> </tr>')
    expect(html).toContain('<tr class="govuk-table__row"> <td class="govuk-table__cell app-wrap"> 8 </td> <td class="govuk-table__cell app-wrap"> <div class="govuk-inset-text app-inset-text---error"> <p class="app-inset-text__value"></p> <p class="app-inset-text__error">Geometry missing</p></div> </td> <td class="govuk-table__cell app-wrap"> Northumberland Gardens </td> <td class="govuk-table__cell app-wrap"> Conservation Area </td> <td class="govuk-table__cell app-wrap"> 6.2 </td> <td class="govuk-table__cell app-wrap"> </td> <td class="govuk-table__cell app-wrap"> <div class="govuk-inset-text app-inset-text---error"> <p class="app-inset-text__value">40/04/2024</p> <p class="app-inset-text__error">Start date must be a real date</p></div> </td> <td class="govuk-table__cell app-wrap"> https://www.newcastle.gov.uk/services/planning-building-and-development/historic-enviornment-and-urban-design/conservation-areas </td> </tr>')
  })

  paginationTemplateTests('results/errors.html', nunjucks)
})
