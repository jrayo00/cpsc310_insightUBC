
/**
 * Receives a query object as parameter and sends it as Ajax request to the POST /query REST endpoint.
 *
 * @param query The query object
 * @returns {Promise} Promise that must be fulfilled if the Ajax request is successful and be rejected otherwise.
 */
CampusExplorer.sendQuery = function (query) {
    return new Promise(function (fulfill, reject) {
        // curl -XPUT "127.0.0.1:4321/dataset/courses/courses" -H "Content-Type: application/x-zip-compressed" --data-binary "@test/data/courses.zip"

        const request = new XMLHttpRequest();
        request.open('POST', '/query', true);
        request.onload = function () {
            fulfill(request.response);
        };
        // asddas
        request.onerror = function () {
            reject('The request failed')
        }
        request.setRequestHeader("Content-Type", "application/json");
        request.send(JSON.stringify(query));
    });
};
