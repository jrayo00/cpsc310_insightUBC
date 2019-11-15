
/**
 * Receives a query object as parameter and sends it as Ajax request to the POST /query REST endpoint.
 *
 * @param query The query object
 * @returns {Promise} Promise that must be fulfilled if the Ajax request is successful and be rejected otherwise.
 */
CampusExplorer.sendQuery = function (query) {
    return new Promise(function (fulfill, reject) {
        // TODO: implement!
        // const fs = require('fs-extra');
        // const buffers = {
        //     courses: fs.readFileSync("../../test/data/courses.zip"),
        //     rooms: fs.readFileSync("../../test/data/rooms.zip")
        // };
        // const endpointURL = "/dataset/courses/courses";
        // const endpointURL2 = "/dataset/rooms/rooms";
        //
        // const xhr = new XMLHttpRequest();
        // xhr.open('PUT', endpointURL, false);
        // xhr.onload = function() {
        //     // const result = JSON.parse(request.responseText);
        //     // console.log(request.responseText);
        // };
        //
        // xhr.onerror = function() {
        //     // console.log('The request failed')
        // }
        // xhr.setRequestHeader("Content-Type", "application/x-zip-compressed");
        //
        // xhr.send("../../test/data/courses.zip");
        //
        // const xhr2 = new XMLHttpRequest();
        // xhr2.open('PUT', endpointURL2, false);
        // xhr2.onload = function() {
        //
        // };
        //
        // xhr2.onerror = function() {
        // }
        // xhr2.setRequestHeader("Content-Type", "application/x-zip-compressed");
        // xhr2.send(buffers["rooms"]);

        const request = new XMLHttpRequest();
        request.open('POST', '/query', true);
        request.onload = function () {
            fulfill(request.responseText);
        };

        request.onerror = function () {
            reject('The request failed')
        }
        request.setRequestHeader("Content-Type", "application/json");
        request.send(JSON.stringify(query));
    });
};
