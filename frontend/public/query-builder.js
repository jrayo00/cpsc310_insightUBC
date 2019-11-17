
/**
 * Builds a query object using the current document object model (DOM).
 * Must use the browser's global document object {@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
 * to read DOM information.
 *
 * @returns query object adhering to the query EBNF
 */
CampusExplorer.buildQuery = function () {
    let query = {};
    // TODO: FINISH TRANSFORMATION PARSING
    const activeTab = document.getElementsByClassName('tab-panel active')[0];
    const dataset = activeTab.getAttribute('data-type');
    query.WHERE = extractWhereObject(activeTab,dataset);
    query.OPTIONS = extractOptionsObject(activeTab,dataset);
    query.TRANSFORMATIONS = extractTransformationObject(activeTab,dataset);
    console.log(JSON.stringify(query));
    return query;
};

function extractWhereConditions(element, dataset) {
    const condArr = [];
    const conditionContainer = element.getElementsByClassName('conditions-container')[0];
    const conditions = conditionContainer.getElementsByClassName('control-group condition');
    for (const condition of conditions) {
        const obj = {};
        const notDiv = condition.getElementsByClassName('control not')[0];
        const notBox = notDiv.getElementsByTagName('input')[0];
        const controlFields = condition.getElementsByClassName('control fields')[0];
        const controlOperators = condition.getElementsByClassName('control operators')[0];
        const controlTerm = condition.getElementsByClassName('control term')[0];
        const selectedField = controlFields.getElementsByTagName('select')[0].value;
        const selectedOperator = controlOperators.getElementsByTagName('select')[0].value;
        let term = controlTerm.getElementsByTagName('input')[0].value;

        if (selectedOperator != "IS"){
            try {
                let tmp = term;
                tmp = Number(tmp);
                if (!isNaN(tmp)) {
                    term = tmp;
                }
            }catch (e) {
                console.log("Invalid.");
            }
        }
        if (notBox.checked) {
            const tmp = {};
            const key = {};
            key[dataset + "_" + selectedField] = term;
            tmp[selectedOperator] = key;
            obj.NOT = tmp;
        } else {
            const key = {};
            key[dataset + "_" + selectedField] = term;
            obj[selectedOperator] = key;
        }

        condArr.push(obj);
    }
    return condArr;
}

function extractWhereObject(element,dataset) {
    let where = {};

    const radioGroup = element.getElementsByClassName('control-group condition-type')[0];
    const selectedInput = getSelectedRadioButton(radioGroup);
    const arr = extractWhereConditions(element,dataset);
    if (arr.length == 1){
        return arr[0];
    } else if (arr.length == 0){
        return where;
    }
    switch (selectedInput.value) {
        case "all":
            where.AND = arr;
            break;
        case "any":
            where.OR = arr;
            break;
        case "none":
            const notObj = {};
            notObj.OR = arr;
            where.NOT = notObj;
            break;
    }
    return where;
}

function getSelectedRadioButton(radioGroup) {
    const buttons = radioGroup.getElementsByTagName('input');
    for (const button of buttons) {
        if (button.checked) {
            return button;
        }
    }
    return undefined;
}


function extractOptionsObject(element,dataset) {
    let options = {};

    const colElement = element.getElementsByClassName('form-group columns')[0];
    const columns = extractCheckedBoxes(colElement,dataset);
    if (typeof columns !== 'undefined' ){
        options.COLUMNS = columns;
    }
    let order = {};
    const orderElement = element.getElementsByClassName('control order fields')[0];
    const keys = extractSelectedFromList(orderElement,dataset);
    if (keys.length > 0) {
        const ele = element.getElementsByClassName('control descending')[0];
        const checkbox = ele.getElementsByTagName('input')[0];
        if(checkbox.checked) {
            order.dir = "DOWN";
        }else {
            order.dir = "UP";
        }
        order.keys = keys;
        options.ORDER = order;
    }
    return options;
}
function extractSelectedFromList(orderElement, dataset) {
    const keys = [];
    const selected = orderElement.getElementsByTagName('select')[0].selectedOptions;
    for(let i = 0; i < selected.length; i++ ){
        const element = selected.item(i);
        keys.push(dataset + "_" + element.value)
    }
    return keys;
}

function extractCheckedBoxes(colElement,dataset) {
    let columns = [];
    const ele = colElement.getElementsByClassName('control field');
    for (const div of ele){
        const checkbox = div.getElementsByTagName('input')[0];
        if(checkbox.checked) {
            columns.push(dataset + "_" + checkbox.value);
        }
    }
    const transformCols = colElement.getElementsByClassName('control transformation');
    for (const div of transformCols){
        const checkbox = div.getElementsByTagName('input')[0];
        if(checkbox.checked) {
            columns.push(checkbox.value);
        }
    }
    return columns;
}

function extractApply(applyObj, dataset) {
    let rules = [];

    const transList = applyObj.getElementsByClassName('control-group transformation');
    for (const trans of transList){
        const obj = {};
        const apply = {};
        const term = trans.getElementsByTagName("input")[0].value;
        const operator = trans.getElementsByTagName("select")[0].value;
        const field = trans.getElementsByTagName("select")[1].value;
        apply[operator] = dataset + "_" + field;
        obj[term] = apply;
        rules.push(obj);
    }

    return rules;
}

function extractTransformationObject(element,dataset) {
    let obj = {};

    const groupObj = element.getElementsByClassName('form-group groups')[0];
    const applyObj = element.getElementsByClassName('form-group transformations')[0];
    const groups = extractCheckedBoxes(groupObj,dataset);
    const apply = extractApply(applyObj,dataset);

    if (groups.length > 0 || apply.length > 0 ){
        obj.GROUP = groups;
        obj.APPLY = apply;
    }
    if (Object.keys(obj).length > 0) {
        return obj;
    }
    return undefined;
}

