export const newRequestTemplate = `
    Dear Data Management Team,

    A new request has been made to add a dataset to the data catalogue. The details of the request are as follows:

    Dataset: {dataset}
    Requested by: {name} ({email})
    Organisation: {organisation}

    Please review the request and take the necessary actions.
`

export const requestAcknowledgedTemplate = `
    Dear {name},
    <br>
    <br>
    We are pleased to inform you that your request to add your {dataset} data has been acknowledged.
    <br>
    <br>
    If you have any questions please contact us at {email}
    <br>
    <br>
    Kind Regards,
    <br>
    The data management team
`