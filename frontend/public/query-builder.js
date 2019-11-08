
/**
 * Builds a query object using the current document object model (DOM).
 * Must use the browser's global document object {@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
 * to read DOM information.
 *
 * @returns query object adhering to the query EBNF
 */
CampusExplorer.buildQuery = function() {
    let query = {};
    // TODO: implement!
    query.WHERE = extractWhereObject();
    query.OPTIONS = extractOptionsObject();

    query.TRANSFORMATIONS = extractTransformationObject();
    console.log(JSON.stringify(query));
    return query;
};

function extractWhereObject() {
    let obj = {};

    return obj;
}

function extractOptionsObject() {
    let obj = {};

    return obj;
}

function extractTransformationObject() {
    let obj = {};

    return obj;
}
