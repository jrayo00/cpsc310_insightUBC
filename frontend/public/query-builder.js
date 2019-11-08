
/**
 * Builds a query object using the current document object model (DOM).
 * Must use the browser's global document object {@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
 * to read DOM information.
 *
 * @returns query object adhering to the query EBNF
 */
CampusExplorer.buildQuery = function() {
    let query = {};
    // TODO: figure out how to extract data-type value from tag!
    const activeTab = document.getElementsByClassName('tab-panel active')[0];
    const dataset = activeTab.getAttribute('data-type');
    query.WHERE = extractWhereObject(activeTab,dataset);
    query.OPTIONS = extractOptionsObject(activeTab,dataset);
    query.TRANSFORMATIONS = extractTransformationObject(activeTab,dataset);
    console.log(JSON.stringify(query));
    return query;
};

function extractWhereObject(element,dataset) {
    let obj = {};

    return obj;
}



function extractOptionsObject(element,dataset) {
    let obj = {};

    const colElement = element.getElementsByClassName('form-group columns')[0];
    const columns = extractColumns(colElement,dataset);
    if (typeof columns !== 'undefined' ){
        obj.COLUMNS = columns;
    }
    return obj;
}

function extractColumns(colElement,dataset) {
    let columns = [];
    const ele = colElement.getElementsByClassName('control field');
    for (const div of ele){
        const checkbox = div.getElementsByTagName('input')[0];
        if(checkbox.checked) {
            columns.push(dataset + "_" + checkbox.value);
        }
    }
    if (columns.length > 0)
        return columns;
    return undefined;
}

function extractTransformationObject(element,dataset) {
    let obj = {};

    return obj;
}
