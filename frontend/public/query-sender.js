/**
 * Receives a query object as parameter and sends it as Ajax request to the POST /query REST endpoint.
 *
 * @param query The query object
 * @returns {Promise} Promise that must be fulfilled if the Ajax request is successful and be rejected otherwise.
 */
CampusExplorer.sendQuery = function(query) {
    return new Promise(function(fulfill, reject) {
        // TODO: implement!
        const request = new XMLHttpRequest();
        request.open('POST', 'http://localhost:4321/query' , true);
        // request.send(query);
        request.onload = function() {
            const result = JSON.parse(request.responseText);
            fulfill(result);
        };

        request.onerror = function() {
            reject('The request failed')
        }
        request.setRequestHeader("Content-Type", "application/json");
        request.send(query);
    });
};
