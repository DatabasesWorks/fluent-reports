"use strict";

/* global PlainDraggable, ShadowRoot */

// Notes:
// plainDraggable .top / .left calculations use the parent containers.getBoundingClientRect() + the objects.getBoundingClientRect()

// This counter makes sure we generate unique elements against every instance, every object -- this needs to stay static
let _frItemUUID = 10000; // jshint ignore:line

class FluentReportsGenerator {

    /*
    * Private Properties
     */
    get uuid() { return this._uuid; }

    get reportLayout() { return this._reportLayout; }
    get reportScroller() { return this._reportScroller; }
    get sectionConstrainer() { return this._sectionConstrainer; }
    // noinspection JSUnusedGlobalSymbols
    get reportData() { return this._reportData; }
    get reportFields() { return this._fields; }
    get reportCalculations() { return this._calculations; }
    get reportVariables() { return this._reportData.variables;}
    get reportTotals() { return this._totals; }
    // noinspection JSUnusedGlobalSymbols
    get reportSections() { return this._sections; }
    // noinspection JSUnusedGlobalSymbols
    get reportGroups() { return this._groupBys; }
    // noinspection JSUnusedGlobalSymbols
    get reportFunctions() { return this._functions; }
    // noinspection JSUnusedGlobalSymbols
    get sectionIn() { return this._sectionIn; }
    get additionalFonts() { return this._registeredFonts; }

    get currentSelected() { return this._currentSelected; }
    set currentSelected(val) { this._currentSelected = val; }
    get properties() { return this._properties; }

    get elementTitle() { return "Report"; }
    get gridSnapping() { return this._gridSnapping; }

    get debugging() { return this._debugging; }
    get scale() { return this._scale; }
    get UIBuilder() { 
        if (this._UIBuilderClass == null) {
            this._UIBuilderClass = new this._UIBuilder(this);
        }
        return this._UIBuilderClass; 
    }
    get frSections() {
        return this._frSections;
    }
    get frElements() {
        return this._frElements;
    }
    get pageWidth() {
        return this._paperDims[0] - this._marginLeft - this._marginRight;
    }
    
    /*
     * Public Properties
     */

    /**
     * Enable/Disable auto printing
     * @returns {boolean}
     */
    get autoPrint() { return this._autoPrint; }
    set autoPrint(val) { this._autoPrint = !!val; }

    /**
     * Expose Margins
     * @returns {*}
     */
    get marginLeft() { return this._marginLeft; }
    set marginLeft(val) { this._marginLeft = parseInt(val, 10); }
    get marginRight() { return this._marginRight; }
    set marginRight(val) { this._marginRight = parseInt(val, 10); }
    get marginTop() { return this._marginTop; }
    set marginTop(val) { this._marginTop = parseInt(val, 10); }
    get marginBottom() { return this._marginBottom; }
    set marginBottom(val) { this._marginBottom = parseInt(val, 10); }

    /**
     * Set/get the file name of the report
     * @returns {string}
     */
    get name() { return this._name; }
    set name(val) { this._name = val; }

    /**
     * Set/Get the font size
     * @returns {number}
     */
    get fontSize() { return this._fontSize; }
    set fontSize(val) { this._fontSize = parseInt(val, 10);}

    /**
     * set/get the paper size
     * @returns {string}
     */
    get paperSize() { return this._paperSize; }
    // noinspection JSUnusedGlobalSymbols
    set paperSize(val) {
        if (val === this._paperSize) {
            return;
        }
        switch (val) {
            case 'letter':
                this._paperDims = [612.00, 792.00];
                break;
            case 'legal':
                this._paperDims = [612.00, 1008.00];
                break;
            default:
                val = 'letter';
                this._paperDims = [612.00, 792.00];

        }
        this._paperSize = val;
        if (this._paperOrientation === "landscape") {
            this._switchOrientation();
        }
        this._resetPaperSizeLocation();
    }

    /**
     * Set / get the reports data
     * @returns {object}
     */
    get data() {
        return this._data;
    }
    set data(val) {
        if (this._data !== val) {
            this._parseData(val);
        }
    }

    /**
     * Set/Get report
     * @returns {{type: string, dataSet: number}}
     */
    get report() {
        return this._generateSave();
    }
    set report(val) {
        if (val !== this._reportData) {
            this._parseReport(val);
        }
    }

    /**
     * Set/Get the Paper orientation
     * @returns {string}
     */
    get paperOrientation() { return this._paperOrientation; }
    // noinspection JSUnusedGlobalSymbols
    set paperOrientation(val) {
        if (val === this._paperOrientation) { return; }
        if (val === 'landscape') {
            this._paperOrientation = "landscape";
        } else {
            this._paperOrientation = "portrait";
        }
        this._switchOrientation();
        this._resetPaperSizeLocation();
    }

    /**
     * The Constructor
     * @param options
     */
    constructor(options) {
        this._UIBuilderClass = null;
        this._UIBuilder = UI;

        // Tracking Information
        this._parentElement = null;
        this._includeCSS = options.css !== false;
        this._includeJS = options.js !== false;
        this._builtUI = false;
        this._fields = {primary: [], levels: 0, titles: []};
        this._reportData = {header: [], footer: [], detail: [], variables: {}};
        this._data = null;
        this._reportScroller = null;
        this._reportLayout = null;
        this._toolBarLayout = null;
        this._sectionConstrainer = null;
        this._propertiesLayout = null;
        this._currentSelected = null;
        this._sectionIn = 0;
        this._debugging = false;
        this._scale = 1.5;
        this._frElements = [];
        this._frSections = [];
        this._registeredFonts = [];

        // Internal Data for UI
        this._calculations = [];
        this._totals = {};
        this._functions = [];
        this._groupBys = [];
        this._subReports = {};

        this._saveFunction = (value, done) => { done(); };
        this._previewFunction = null;
        this._uuid = _frItemUUID++;
        this._gridSnapping = {snapping: false, size: 10};
        this._saveTemporaryData = null;

        // Report Properties
        this._paperSize = "letter";
        this._paperOrientation = "portrait";
        this._paperDims = [612.00, 792.00];  // 72px per inch
        this._fontSize = 10;
        this._autoPrint = false;
        this._marginLeft = 72;
        this._marginRight= 72;
        this._marginTop = 72;
        this._marginBottom = 72;

        this._name = "report.pdf";
        this._properties = [
            {type: 'string', field: 'name', functionable: true},
            {type: 'boolean', field: 'autoPrint', default: false},
            {type: 'number', field: 'fontSize', default: 0},
            {type: 'number', title: 'margin.left', field: 'marginLeft', default: 72},
            {type: 'number', title: 'margin.right', field: 'marginRight', default: 72},
            {type: 'number', title: 'margin.top', field: 'marginTop', default: 72},
            {type: 'number', title: 'margin.bottom', field: 'marginBottom', default: 72},
            {type: 'selection', title: 'Paper Size', field: 'paperSize', values: ['letter', 'legal'], default: 'letter'},
            {type: 'selection', title: 'Orientation', field:'paperOrientation', values: ['portrait', 'landscape'], default: 'portrait'},
            {type: 'button', title: 'Variables', click: this._setVariables.bind(this)},
            {type: 'button', title: 'Totals', click: this._setTotals.bind(this)},
            {type: 'button', title: 'Fonts', click: this._setFonts.bind(this)}
        ];


        if (options.scale) {
            this.setConfig('scale', options.scale);
        } else {
            // TODO: Maybe determine size of UI layout and scale dynamically?
            this._scale = 1.5;
        }

        // Allows overriding UI System
        if (typeof options.UIBuilder !== 'undefined') {
            this.setConfig('UIBuilder', options.UIBuilder);
        }

        if (typeof options.data !== 'undefined') {
            this._parseData(options.data);
        }

        if (options.report) {
            // TODO - FUTURE: Maybe save & verify report based on parsed data to verify data layout being sent into
            //      - editor matches the report layout's last data, and so we have the field layout in the event no data is passed in.
            this._parseReport(options.report);
        } else {
            this._createReportOnData();
        }
        if (typeof options.save === 'function') {
            this.setConfig('save', options.save);
        }
        if (typeof options.element !== 'undefined') {
            this.setConfig('element', options.element);
        } else {
            if (options.id) {
                this.setConfig('id', options.id);
            }
        }
        if (options.debug) {
            this.setConfig('debug', options.debug);
        }
        if (typeof options.preview === 'function') {
            this.setConfig('preview', options.preview);
        }

        this.buildUI(this._parentElement);
    }

    /**
     * Set the Configuration for a report parameter
     * @param option
     * @param value
     */
    setConfig(option, value) {
        if (value == null) { return; }
        switch (option) {
            case 'scale':
                this._scale = parseFloat(value);
                break;

            case 'UIBuilder':
                if (typeof value.clearArea !== 'undefined') {
                    this._UIBuilder = value;
                    if (this._UIBuilderClass) {
                        this._UIBuilderClass.destroy();
                        this._UIBuilderClass = null;
                    }
                }
                break;

            case 'data':
                this._parseData(value);
                break;

            case 'report':
                this._parseReport(value);
                break;

            case 'save':
                if (typeof value === 'function') {
                    this._saveFunction = value;
                }
                break;

            case 'element':
                this._parentElement = value;
                break;

            case 'id':
                this._parentElement = document.getElementById(value);
                break;

            case 'debug':
                this._debugging = !!value;
                console.log("Debugging", this._debugging);
                break;

            case 'preview':
                if (typeof value === 'function') {
                    this._previewFunction = value;
                }
                break;

            default:
                if (this.debugging) {
                    console.error("fluentReports: unknown setConfig option", option);
                }
        }

    }

    /**
     * Figures out where the element was dragged to know which section it is now in
     * @param offset
     * @returns {number}
     * @private
     */
    _getSectionIn(offset) {
        let sec = 0;
        const len = this._frSections.length;
        for (let i=0;i<len;i++) {
            const top = this._frSections[i].top;
            if (offset >= top && offset <= top + this._frSections[i].height) {
                sec = i;
                break;
            }
        }
        return sec;
    }

    /**
     * Returns a section
     * @param id
     * @returns {*}
     * @private
     */
    _getSection(id) {
        return this._frSections[id];
    }

    /**
     * Gets the section options
     * @param sectionIn
     * @returns {{top: string}}
     * @private
     */
    _getSectionOptions(sectionIn) {
        let options = {top: "5px"};
        if (sectionIn > 0) {
            const section = this._frSections[sectionIn-1];

            // TODO: Change to calculated number 5 is +5 for white space offset
            options.top = (parseInt(section._draggable.element.style.top, 10)+5)+"px";
        }
        return options;
    }

    /**
     * Handles dealing with switching the paper orientations
     * @private
     */
    _switchOrientation() {
        const temp = this._paperDims[0];
        if (this._paperOrientation === 'landscape') {
            if (this._paperDims[1] > temp) {
                this._paperDims[0] = this._paperDims[1];
                this._paperDims[1] = temp;
            }
        } else {
            if (this._paperDims[1] < temp) {
                this._paperDims[0] = this._paperDims[1];
                this._paperDims[1] = temp;
            }
        }
    }

    /**
     * Parses the new data file to make sure it is correct
     * @param data
     * @private
     */
    _parseData(data) {
        if (!Array.isArray(data)) {
            throw new Error("fluentReports: Invalid dataset, should be an array of objects.");
        }
        if (data.length < 1) {
            throw new Error("fluentReports: Invalid dataset, should have at least one record");
        }
        // Reset to No Data Dictionary
        this._fields = {primary: [], levels: 0, titles: []};

        this._data = data;

        // Lets create the data Dictionary
        this._parseDataLevel(data[0], 'primary','primary', 0);
    }

    /**
     * Creates a dummy report based on the data, if you haven't passed in a report.
     * @private
     */
    _createReportOnData() {
        let tempReport;
        if (this._data === null || this._data.length === 0) {
            tempReport = {
                type: "report",
                header: {type: "raw", values: ["Sample Header"]},
                detail: {type: "text", text: "Welcome to fluentReports"},
                footer: {type: "raw", values: ["Sample Footer"]}
            };
            this._data = [];
        } else {
            tempReport = {
                type: "report",
                header: {type: "raw", values: ["Sample Header"]},
                footer: {type: "raw", values: ["Sample Footer"]}
            };
            if (this.reportFields.titles.length === 1) {
                tempReport.detail = {type: "text", text: "Welcome to fluentReports"};
            } else {
                let src = tempReport;
                for (let i=1;i<this.reportFields.titles.length;i++) {
                    src.subReport = {type: 'report', dataType: 'parent', data: this.reportFields.titles[i]};
                    if (i === this.reportFields.titles.length-1) {
                        src.subReport.detail = {type: "text", text: "Welcome to fluentReports"};
                    }
                    src = src.subReport;
                }
            }

        }
        this._parseReport(tempReport);
    }

    /**
     * Parses a Report
     * @param report
     */
    _parseReport(report) {
        console.log("Parse Report");
        this._reportData = report;
        if (this._builtUI) {
            this._clearReport();
            // Create the Sections
            this._generateReportLayout(this._reportData, 57, "", 0);
        }

        // TODO: Add any missing properties
        this._copyProperties(report, this, ["name", "fontSize", "autoPrint", "paperSize", "paperOrientation"]);

        if (Array.isArray(report.fonts) && report.fonts.length) {
            this._registeredFonts = report.fonts;
        }

        // Add Margins
        if (typeof report.margins !== 'undefined') {
            this._marginBottom = report.margins.bottom || 72;
            this._marginTop = report.margins.top || 72;
            this._marginRight = report.margins.right || 72;
            this._marginLeft = report.margins.left || 72;
        }

        if (this._builtUI) {
            this._reportSettings();
        }
    }

    /**
     * Starts generating the save data
     * @returns {{type: string, dataSet: number}}
     * @private
     */
    _generateSave() {
        // Setup our temporary data storage
        this._saveTemporaryData = {reports: []};

        const results = {type: 'report', dataSet: 0};
        this._copyProperties(this, results, ["fontSize", "autoPrint", "name", "paperSize", "paperOrientation"]);
        if (this._marginBottom !== 72 || this._marginTop !== 72 || this._marginLeft !== 72 || this._marginRight !== 72) {
            results.margins = {left: this._marginLeft, top: this._marginTop, right: this._marginRight, bottom: this._marginBottom};
        }

        this._saveTemporaryData.reports.push(results);

        results.fonts = this.additionalFonts;
        results.variables = shallowClone(this.reportVariables);
        
        // Save the Sections
        for (let i=0;i<this._frSections.length;i++) {
                this._frSections[i]._generateSave(results);
        }
        
        // Save the Totals..
        for (let i=0;i<this._saveTemporaryData.reports.length;i++) {
            this._saveTotals(this._saveTemporaryData.reports[i], this._saveTemporaryData.reports[i].dataSet);
        }

        // Update groups data with any Groups that have no actual sections
        for (let i=0;i<this._groupBys.length;i++) {
            let curData = this._saveTemporaryData.reports[this._groupBys[i].dataSet];
            let found = false;
            if (curData.groupBy) {
                for (let j = 0; j < curData.groupBy.length; j++) {
                    if (curData.groupBy[j].groupOn === this._groupBys[i].name) {
                        found = true;
                        j = curData.groupBy.length;
                    }
                }
            } else {
                curData.groupBy = [];
            }
            if (!found) {
                curData.groupBy.push({type: "group", groupOn: this._groupBys[i].name});
            }
        }

        // Remove Groups in Report, that no longer exist in the groupby data
        for (let i=0;i<this._saveTemporaryData.reports.length;i++) {
            let curData = this._saveTemporaryData.reports[i];
            // No Groups; proceed to the next one...
            if (!curData.groupBy) { continue; }
            for (let j=0;j<curData.groupBy.length;j++) {
                let found = false;
                for (let k=0;k<this._groupBys.length;k++) {
                    if (curData.groupBy[j].groupOn === this._groupBys[k].name) {
                        found = true;
                    }
                }
                if (!found) {
                    curData.groupBy.splice(j, 1);
                    j--;
                }
            }
        }



        // Clear our temporary data storage
        this._saveTemporaryData = null;

        return results;
    }

    /**
     * Saves any total information
     * @param dest
     * @param dataSet
     * @private
     */
    _saveTotals(dest, dataSet) {
        const totals = this.reportTotals;
        let fields, calcs=null;

        if (dataSet === 0) {
            fields = this.reportFields.primary;
        } else {
            fields = this.reportFields["level"+dataSet];
        }

        for (let key in totals) {
            if (!totals.hasOwnProperty(key)) { continue; }
            for (let i=0;i<totals[key].length;i++) {
                if (fields.indexOf(totals[key][i]) >= 0) {
                    if (calcs == null) {
                        calcs = {};
                    }
                    if (calcs[key] == null) {
                        calcs[key] = [];
                    }
                    calcs[key].push(totals[key][i]);
                }
            }
        }

        if (calcs != null) {
            dest.calcs = calcs;
        }
    }

    /**
     * Saves any Variable information
     * @private
     */
    _setVariables() {
       this.UIBuilder.variableBrowse(this._reportData.variables, (value) => {
            this._reportData.variables = value;
        });
    }

    /**
     * Edit the Total variables
     * @private
     */
    _setTotals() {
       this.UIBuilder.totalsBrowse(this.reportTotals, this, (value) => {
            this._totals = value;
        });
    }

    /**
     * Edit the Fonts variables
     * @private
     */
    _setFonts() {
        this.UIBuilder.fontsBrowse(this.additionalFonts, (value) => {
            this._registeredFonts = value;
        });
    }


    /**
     * Simple shallow clone of properties to another object
     * Used to copy properties from/to save structure
     * @param src
     * @param dest
     * @param props
     * @private
     */
    _copyProperties(src, dest, props) {
        if (src == null) { return; }
        for (let i=0;i<props.length;i++) {
            if (typeof src[props[i]] !== 'undefined') {
                dest[props[i]] = src[props[i]];
            }
        }
    }

    /**
     * Parses a Dataset to figure out field names, recursively
     * @param rowOfData - A Single record to parse
     * @param title - DataSet title
     * @param dataSet - Where to store the dataset  ('primary' | 'level')
     * @param level - Level of dataset...
     * @private
     */
    _parseDataLevel(rowOfData, title, dataSet, level) {
        let newDataSet = dataSet + (level > 0 ? level : '');
        this._fields.levels = level;
        this._fields.titles.push(title);
        this._fields[newDataSet] = [];
        for (let key in rowOfData) {
            if (!rowOfData.hasOwnProperty(key)) { continue; }
            if (Array.isArray(rowOfData[key])) {
                if (rowOfData[key].length > 0) {
                    this._parseDataLevel(rowOfData[key][0], key, 'level', level+1);
                } else {
                    console.warn("fluentReports: DataSet is empty dataset", dataSet, key);
                }
            } else {
                this._fields[newDataSet].push(key);
            }
        }

    }

    /**
     * Clears a Report
     * @private
     */
    _clearReport() {
        console.log("Clear Report");

        // Reset Tracking Data
        this._groupBys = [];
        this._totals = {};
        this._sectionIn = 0;
        this._calculations = [];
        this._functions = [];
        this._groupBys = [];
        this._subReports = {};
        this._registeredFonts = [];

       this.UIBuilder.clearArea(this._reportLayout);
        // Read-add our Section Constrainer
        this._reportLayout.appendChild(this._sectionConstrainer);

       this.UIBuilder.clearArea(this._propertiesLayout);
        this._frElements = [];
        this._frSections = [];
    }

    buildUI(idOrElement) {
        if (this._builtUI) {
            console.error("fluentReports: Attempting to call build on an already buildthis.");
            return true;
        }

        // If it hasn't already been assigned in the Constructor...
        if (!this._parentElement) {
            if (idOrElement != null) {
                if (typeof idOrElement === "string") {
                    this._parentElement = document.getElementById(idOrElement);
                    if (this._parentElement == null) {
                        console.error("fluentReports: Unable to find dev element: ", idOrElement);
                        return false;
                    }
                } else {
                    this._parentElement = idOrElement;
                }
            }
            if (!this._parentElement) {
                console.error("fluentReports: Missing element");
                return false;
            }
        }

        this._frame = document.createElement("div");
        this._frame.style.position = "relative";

        this._frame.style.height = (this._parentElement.clientHeight < 300 ? 300 : this._parentElement.clientHeight)+"px";

        // Prefix the entire sub-tree with our name space for CSS resolution
        this._frame.classList.add("fluentReports");
        this._parentElement.appendChild(this._frame);

        // Keep from running a second time...
        this._builtUI = true;

        if (this._includeCSS) {
            // TODO: Check to see if this file already exists in the head area
            let link = document.createElement('link');
            link.setAttribute('rel', 'stylesheet');
            link.setAttribute('type', 'text/css');
            link.setAttribute('href', './fr.css');

            // Find the ShadowRoot, if it exists
            let parent = this._parentElement;
            let hasShadow = false;

            while (parent != null) {
                if (parent instanceof ShadowRoot) { hasShadow = true; break; }
                if (parent instanceof HTMLBodyElement || parent instanceof HTMLHeadElement) { break; }
                parent = parent.parentNode;
            }

            if (hasShadow && parent != null) {
                parent.appendChild(link);
            } else {
                document.getElementsByTagName('head')[0].appendChild(link);
            }
        }
        let fontSheet = document.createElement('style');
        fontSheet.innerHTML = "@font-face { font-family: 'fr'; font-weight: normal; font-style: normal; " +
            "src: url(data:application/font-woff;charset=utf-8;base64,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) format('woff'); " +
            " }";

        document.body.appendChild(fontSheet);


        if (this._includeJS) {
            // TODO: Check to see if this file already exists in the head area
            let script = document.createElement('script');
            script.src = "./plain-draggable.min.js";
            document.getElementsByTagName('head')[0].appendChild(script);
            let frScript = document.createElement('script');
            if (this.debugging) {
                frScript.src = "./fluentReportsBrowser.js";
            } else {
                frScript.src = "./fluentReportsBrowser.min.js";
            }
            document.getElementsByTagName('head')[0].appendChild(frScript);
        }
        this._frame.style.alignContent = "top";

        this._toolBarLayout = document.createElement("div");
        this._toolBarLayout.id = "frToolBar";
        this._toolBarLayout.className = "frToolBar";
        this._frame.appendChild(this._toolBarLayout);

        this._propertiesScroller = document.createElement('div');
        this._propertiesScroller.className = "frPropScroller";

        this._propertiesLayout = document.createElement("div");
        this._propertiesLayout.className = "frProperties";
        this._propertiesLayout.id = "frProperties";
        this._propertiesLayout.style.minHeight = (this._frame.clientHeight-51)+"px"; // TODO: Get actual size of toolBarLayout instead of hardcoding it...
        this._propertiesScroller.appendChild(this._propertiesLayout);
        this._frame.appendChild(this._propertiesScroller);


        this._reportScroller = document.createElement("div");
        this._reportScroller.id = "frReport";
        this._reportScroller.className = "frReport";
        this._reportLayout = document.createElement("div");
        this._reportLayout.className = "frReportInner";
        this._reportLayout.style.minHeight = (this._frame.clientHeight-51)+"px"; // TODO: Get actual size of toolBarLayout instead of hardcoding it...
        this._reportLayout.addEventListener("click", this._reportLayoutClicked.bind(this));
        this._reportScroller.appendChild(this._reportLayout);
        this._sectionConstrainer = document.createElement("div");
        this._sectionConstrainer.style.left = "0px";
        this._sectionConstrainer.style.width = "0px";
        this._sectionConstrainer.style.height = "0px";
        this._sectionConstrainer.style.position = "absolute";
        this._reportLayout.appendChild(this._sectionConstrainer);
        this._frame.appendChild(this._reportScroller);

        this._paperWidthLayout = document.createElement('div');
        this._paperWidthLayout.className = "frPaperWidthLayout";
        this._paperWidthLayout.style.position = "absolute";
        this._paperWidthLayout.style.width = "1px";
        this._frame.appendChild(this._paperWidthLayout);
        this._generateInterface();
    }

    /**
     * Fixes up the Size of Page Line Location
     * @private
     */
    _resetPaperSizeLocation() {
        const topRect = this._frame.getBoundingClientRect();

        const rect = this._reportLayout.getBoundingClientRect();
        this._paperWidthLayout.style.top = (rect.top-topRect.top)+"px";
        this._paperWidthLayout.style.left = (rect.left + (this._paperDims[0]*this.scale)) + "px";
        this._paperWidthLayout.style.height = rect.height+"px";
        if (rect.width < ((this._paperDims[0]*this.scale)+18)) {
            this._paperWidthLayout.style.display = "none";
        } else {
            this._paperWidthLayout.style.display = "";
        }
    }

    _reportLayoutClicked(args) {
        if (this._currentSelected) {
            this._currentSelected.blur();
        }

        const offset = this._reportLayout.getBoundingClientRect();
        const y = (args.clientY - offset.top) + this._reportScroller.scrollTop;
        this._sectionIn = this._getSectionIn(y);
        this.showProperties(this._getSection(this._sectionIn), true);
    }

    _generateInterface() {
        if (typeof window.PlainDraggable !== 'undefined') {
            this._generateToolBarLayout();
            this._generateReportLayout(this._reportData, 57, "", 0);
            this._reportSettings();
            this._resetPaperSizeLocation();
        } else {
            setTimeout(() => {
                this._generateInterface();
            }, 500);
        }
    }
    
    _openGroupings() {
        //groupBy
       this.UIBuilder.groupsBrowse(this._groupBys,  this,    (groups) => {
            let changed = 0;
            for (let i=0;i<this._groupBys.length;i++) {
                for (let j=0;j<groups.length;j++) {
                    if (this._groupBys[i].name === groups[j].name && this._groupBys[i].dataSet === groups[j].dataSet) {
                        j=groups.length; changed++;
                    }
                }
            }

            if (this._groupBys.length !== changed) {
                this._groupBys = groups;
                const newReport = this._generateSave();
                this._parseReport(newReport);
            } else {
                this._groupBys = groups;
            }
        });
    }

    _openSections() {
       // Generate the current layout report so we can easily parse it in the sectionBrowse
       let currentReport = this._generateSave();
       this.UIBuilder.sectionBrowse(this, currentReport, (updateReport) => {
            this._parseReport(updateReport);
        } );
    }

    _addNewElementFromToolBar(classType, overrideOptions) {
        const options = this._getSectionOptions(this._sectionIn);
        for (let key in overrideOptions) {
            if (overrideOptions.hasOwnProperty(key)) {
                options[key] = overrideOptions[key];
            }
        }
        new classType(this, this._getSection(this._sectionIn), options); // jshint ignore:line
    }

    _generateToolBarLayout() {

          this._toolBarLayout.appendChild(this.UIBuilder.createSpacer());
          this._toolBarLayout.appendChild(this.UIBuilder.createToolbarButton("\ue834", "Report settings", () => { this._reportSettings(); }));
          this._toolBarLayout.appendChild(this.UIBuilder.createToolbarButton("\ue822", "Group data by", () => { this._openGroupings(); }));
          this._toolBarLayout.appendChild(this.UIBuilder.createToolbarButton("\ue819", "Sections", () => { this._openSections(); }));
          this._toolBarLayout.appendChild(this.UIBuilder.createSpacer());

        this._toolBarLayout.appendChild(this.UIBuilder.createToolbarButton("\ue801", "New line", () => {
            this._addNewElementFromToolBar(frNewLine, {top: 1});

/*            let options = this._getSectionOptions(this._sectionIn);
            options.top = 1;
            new frNewLine(this, this._getSection(this._sectionIn), options ); // jshint ignore:line */
        }));
          this._toolBarLayout.appendChild(this.UIBuilder.createSpacer());

        this._toolBarLayout.appendChild(this.UIBuilder.createToolbarButton("\ue82D", "Print label", () => {
            let options = this._getSectionOptions(this._sectionIn);
            new frPrintLabel(this, this._getSection(this._sectionIn), options); // jshint ignore:line
        }));
          this._toolBarLayout.appendChild(this.UIBuilder.createToolbarButton("\ue828", "Print data field", () => {
              let options = this._getSectionOptions(this._sectionIn);
              options.label = (this._fields.primary[0] || "????");
              options.field = this._fields.primary[0];
             new frPrintField(this, this._getSection(this._sectionIn), options); // jshint ignore:line
          }));
        this._toolBarLayout.appendChild(this.UIBuilder.createToolbarButton("\ue818", "Print dynamic data", () => {
            let options = this._getSectionOptions(this._sectionIn);
            options.variable = "";
            options.type = "variable";
            new frPrintDynamic(this, this._getSection(this._sectionIn), options); // jshint ignore:line
        }));
        this._toolBarLayout.appendChild(this.UIBuilder.createToolbarButton("\ue83D", "Print Page", () => {
            let options = this._getSectionOptions(this._sectionIn);
            new frPrintPageNumber(this, this._getSection(this._sectionIn), options); // jshint ignore:line
        }));
        this._toolBarLayout.appendChild(this.UIBuilder.createToolbarButton("\ue81F", "Print function", () => {
            let options = this._getSectionOptions(this._sectionIn);
            new frPrintFunction(this, this._getSection(this._sectionIn), options); // jshint ignore:line
        }));

        this._toolBarLayout.appendChild(this.UIBuilder.createSpacer());

        this._toolBarLayout.appendChild(this.UIBuilder.createToolbarButton("\ue81a", "Image", () => {
            let options = this._getSectionOptions(this._sectionIn);
            new frImage(this, this._getSection(this._sectionIn), options); // jshint ignore:line
        }));


        this._toolBarLayout.appendChild(this.UIBuilder.createToolbarButton("\ue826", "Shape", () => {
            let options = this._getSectionOptions(this._sectionIn);
            new frSVGElement(this, this._getSection(this._sectionIn), options); // jshint ignore:line
        }));

        this._toolBarLayout.appendChild(this.UIBuilder.createSpacer());


        this._toolBarLayout.appendChild(this.UIBuilder.createToolbarButton("\ue838", "Band", () => {
            let options = this._getSectionOptions(this._sectionIn);
            new frBandElement(this, this._getSection(this._sectionIn), options); // jshint ignore:line
        }));
        this._toolBarLayout.appendChild(this.UIBuilder.createToolbarButton("\ue814", "Band Line", () => {
            let options = this._getSectionOptions(this._sectionIn);
            new frBandLine(this, this._getSection(this._sectionIn), options); // jshint ignore:line
        }));


        this._toolBarLayout.appendChild(this.UIBuilder.createSpacer());

        let snapIcon =this.UIBuilder.createToolbarButton("\ue83A", "Snap to grid", () => {
            this._gridSnapping.snapping = !this._gridSnapping.snapping;
            if (this._gridSnapping.snapping) {
                snapIcon.innerText = "\ue839";
            } else {
                snapIcon.innerText = "\ue83A";

            }
        });
        this._toolBarLayout.appendChild(snapIcon);

        this._toolBarLayout.appendChild(this.UIBuilder.createSpacer());

        this._toolBarLayout.appendChild(this.UIBuilder.createToolbarButton("\ue833", "Save", () => {
            const topLayer = document.createElement("div");
            topLayer.style.zIndex = "100";
            topLayer.style.backgroundColor = "#000000";
            topLayer.style.opacity = "0.7";
            topLayer.style.position = "absolute";
            topLayer.style.cursor = "wait";

            const rect = this._frame.getBoundingClientRect();
            topLayer.style.top = "0px"; // rect.top;
            topLayer.style.left = "0px"; // rect.left;
            topLayer.style.width = rect.width;
            topLayer.style.height = rect.height;
            this._frame.appendChild(topLayer);

            const data = this._generateSave();

            this._saveFunction(data, () => {
                this._frame.removeChild(topLayer);
            });


        }));

        this._toolBarLayout.appendChild(this.UIBuilder.createToolbarButton("\ue832", "Preview", () => {
            const topLayer = document.createElement("div");
            topLayer.style.zIndex = "100";
            topLayer.style.backgroundColor = "#000000";
            topLayer.style.opacity = "0.9";
            topLayer.style.position = "absolute";
            topLayer.style.cursor = "wait";

            const rect = this._frame.getBoundingClientRect();
            topLayer.style.top = "0px";
            topLayer.style.left = "0px";
            topLayer.style.width = rect.width;
            topLayer.style.height = rect.height;
            this._frame.appendChild(topLayer);
            this._topLayer = topLayer;

            // If we have a preview function, then we use it rather than continue the default behavior
            if (typeof this._previewFunction === 'function') {
                this._previewFunction(this, () => {
                    this.closeLayer();
                });
                return;
            }

            this.preview({parent: topLayer});
        }));
    }

    closeLayer() {
        if (this._topLayer) {
            this._frame.removeChild(this._topLayer);
            this._topLayer = null;
        }
    }

    preview(options = {}) {
        let topLayer = this._topLayer;
        if (options.parent != null && typeof options.parent.appendChild === 'function') {
            topLayer = options.parent;
        }
        if (topLayer == null) {
            console.error("No 'parent' to add preview to, please pass in a html element for embedding preview in.");
            return;
        }
        const rect = this._frame.getBoundingClientRect();
        const iFrame = document.createElement('iframe');
        iFrame.style.position = "relative";
        iFrame.style.width = rect.width + "px";
        iFrame.style.height = rect.height + "px";
        const close = document.createElement('input');
        close.type = "button";
        close.value = "Close";
        close.style.position = "absolute";
        close.style.top = (rect.height - 28) + "px";
        close.style.height = "28px";
        close.style.left = "1px";
        close.style.zIndex = "999";
        close.style.fontSize = "14pt";


        const closeListener = () => {
            close.removeEventListener("click", closeListener);
            document.removeEventListener("keydown", keyListener);
            this.closeLayer();
            if (typeof options.close === 'function') {
                    options.close();
            }
        };

        const keyListener = (event) => { // jshint ignore:line
            if (event.key === "Escape") {
                closeListener();
                event.stopPropagation();
            }
        };

        close.addEventListener("click", closeListener);
        document.addEventListener("keydown", keyListener);
        topLayer.appendChild(iFrame);
        topLayer.appendChild(close);

        const reportData =  options.report || this._generateSave();
        const data = options.data || this._data;

        let pipeStream = new window.fluentReports.BlobStream();
        // Create the Report
        let rpt = new window.fluentReports.ReportBuilder(reportData, data);

        // Send it to a pipe stream...
        rpt.outputType(1, pipeStream);

        if (this.debugging) {
            // Console log the structure in debug mode
            rpt.printStructure();
        }

        if (this.debugging) {
            console.time("Rendered");
        }
        rpt.render().then((pipe) => {
            if (this.debugging) {
                console.timeEnd("Rendered");
            }
            iFrame.src = pipe.toBlobURL('application/pdf');
        }).catch((err) => {
            console.error("Your report had errors while running", err);
            Dialog.notice("Previewing Report Had Errors: " + err.toString(), "#FF0000", this._frame);
        });
    }

    _reportSettings() {
        this.showProperties(this, true);
    }

    _generateReportHeaderSectionLayout(data, height, groupName='', dataSet=0) {
        if (typeof data.titleHeader !== 'undefined') {
            this._generateSection("Title Header", height, 1, groupName, dataSet, data.titleHeader);
        }
        if (typeof data.pageHeader !== 'undefined') {
            this._generateSection("Page Header", height, 1, groupName, dataSet, data.pageHeader);
        }
        if (typeof data.header !== 'undefined') {
            this._generateSection("Header", height, 1, groupName, dataSet, data.header);
        }
        if (typeof data.groupBy !== 'undefined') {
            for (let i = 0; i < data.groupBy.length; i++) {
                let found = false;
                for (let j=0;j<this._groupBys.length;j++) {
                    if (this._groupBys[j].dataSet === dataSet && this._groupBys[j].name === groupName) {
                        found=true;
                    }
                }
                if (!found) {
                    this._groupBys.push({name: data.groupBy[i].groupOn, dataSet: dataSet});
                }
                this._generateReportHeaderSectionLayout(data.groupBy[i], height, data.groupBy[i].groupOn, dataSet);
            }
        }
    }

    _generateReportDetailSectionLayout(data, height, groupName='', dataSet=0, isGroup=false) {
        if (typeof data.detail !== 'undefined') {
            this._generateSection("Detail", height, 3, groupName, dataSet, data.detail, isGroup);
        }
        if (typeof data.subReport !== 'undefined') {
            this._generateReportLayout(data.subReport, height, data.subReport.data, dataSet+1);
        }

        if (typeof data.groupBy !== 'undefined') {
            for (let i = 0; i < data.groupBy.length; i++) {
                this._generateReportDetailSectionLayout(data.groupBy[i], height, data.groupBy[i].groupOn, dataSet, true);
            }
        }
    }

    _generateReportFooterSectionLayout(data, height, groupName='', dataSet=0) {
        if (typeof data.groupBy !== 'undefined') {
            for (let i = 0; i < data.groupBy.length; i++) {
                this._generateReportFooterSectionLayout(data.groupBy[i], height, data.groupBy[i].groupOn, dataSet);
            }
        }
        if (typeof data.footer !== 'undefined') {
            this._generateSection("Footer", height, 2, groupName, dataSet, data.footer);
        }
        if (typeof data.pageFooter !== 'undefined') {
            this._generateSection("Page Footer", height, 2, groupName, dataSet, data.pageFooter);
        }
        if (typeof data.finalSummary !== 'undefined') {
            this._generateSection("Final Summary", height, 2, groupName, dataSet, data.finalSummary);
        }
    }

    _generateReportLayout(data, height, groupName, dataSet=0) {

        console.log("GenerateReportLayout", groupName);
        if (dataSet > 0) {
            this._subReports[groupName] = {dataSet: dataSet};
            // TODO: Might need more sub-report properties?
            this._copyProperties(data, this._subReports[groupName], ["type", "dataType", "data", "calcs", "fontSize"]);
            if (this._subReports[groupName].calcs) {
                this._mergeTotals(groupName, this._subReports[groupName].calcs);
            }
        }
        this._generateReportHeaderSectionLayout(data, height, groupName, dataSet);
        this._generateReportDetailSectionLayout(data, height, groupName, dataSet, false);
        this._generateReportFooterSectionLayout(data, height, groupName, dataSet);
    }

    _mergeTotals(groupName, totals) {
        const totalsTypes = ['sum', 'min', 'max', 'average', 'count'];
        for (let i=0;i<totalsTypes.length;i++) {
            if (totals[totalsTypes[i]]) {
                // Fix Names to be TABLE.field
                //for (let j=0;j<totals[totalsTypes[i]].length;j++) {
                //    totals[totalsTypes[i]][j] = groupName + "." + totals[totalsTypes[i]][j];
                //}

                if (!this._totals[totalsTypes[i]]) {
                    this._totals[totalsTypes[i]] = totals[totalsTypes[i]];
                } else {
                    this._totals[totalsTypes[i]].concat(totals[totalsTypes[i]]);
                }
            }
        }
    }

    _generateSection(title, height, type, groupName, dataSet, sectionData, fromGroup=false) {
        const section = new frSection(this, {title: title, height: height, type: type, group: groupName, dataSet: dataSet, fromGroup: fromGroup});
        if (sectionData == null) { return; }
        if (Array.isArray(sectionData)) {
            for (let i=0;i<sectionData.length;i++) {
                section._parseSection(sectionData[i]);
            }
        } else {
            section._parseSection(sectionData);
        }
    }

    showProperties(obj, refresh=false) {
       this.UIBuilder.showProperties(obj, this._propertiesLayout, refresh);
    }

}


// ----------------------------------------- [ Sections ] ----------------------------------------------

class frSection { // jshint ignore:line
    
    get readOnly() {
        return this._readOnly;
    }

    get properties() {
        return this._properties;
    }

    get top() {
        return parseInt(this._html.style.top, 10);
    }
    set top(val) {
        this._html.style.top = val + "px";
    }

    get height() {
        return parseInt(this._html.style.height, 10);
    }

    set height(valIn) {
        const val = parseInt(valIn, 10);
        if (this.height === val) { return; }

        this._html.style.height = (val)+"px";
        this._frLine.style.top = (val-2)+"px";
        this._resetTops(this._sectionId);
        this._draggable.position();
    }

    get elementContainerHeight() {
        const x = this._titleTD.getBoundingClientRect();
        return this.height - x.height;
    }
    set elementContainerHeight(val) {
        // We have to actually resize the entire outer container,
        // so we get the titles height to be able to track this...
        const x = this._titleTD.getBoundingClientRect();
        this.height = val+x.height;
    }

    get elementContainerTop() {
        const x = this._titleTD.getBoundingClientRect();
        return this.top + x.height;
    }

    get bottom() {
        return (parseInt(this._html.style.top, 10) +  parseInt(this._html.style.height, 10));
    }

    get elementContainer() {
        return this._elementDiv;
    }

    get fixedHeight() { return this._fixedHeight; }
    set fixedHeight(val) { this._fixedHeight = !!val; }

    get sectionId() { return this._sectionId; }
    get uuid() { return this._uuid; }

    get type() { return this._type; }

    // noinspection JSUnusedGlobalSymbols
    get hasStockElement() { return this._stockElement != null; }
    set usingStock(val) {
        this._usingStock = !!val;
        if (this._usingStock) {
            this.createStockElement();
        } else if (this._stockElement) {
            this._stockElement.delete();
            this._stockElement = null;
        }
    }
    get usingStock() { return this._usingStock; }
    get elementTitle() { return this._title; } // Used by Layout Engine
    get title() { return this._title; }
    set title(val) {
        this._title = val;
        this._titleSpan = this._generateTitle();
    }

    get groupName() { return this._groupName; }
    set groupName(val) {
        this._groupName = val;
        this._properties[0].skip = (this._type === 3 /* Detail */ || this._groupName === '');
        this._properties[1].skip = (this._type !== 3 || this._groupName === '');
        this._titleSpan = this._generateTitle();
    }

    createStockElement() {
        if (this._stockElement) { return this._stockElement; }
        // noinspection JSCheckFunctionSignatures
        let left = (parseInt( (612 * this.scale), 10)  / 2) - 45;
        switch (this._type) {
            case 1: // Header
                this._stockElement = new frStandardHeader(this._report, this, {top: parseInt(this._html.style.top,10), left: left });
                break;
            case 3: // Details
                console.error("CreateStockElement called on a Detail section....");
                break;
            case 2: // Footer
                this._stockElement = new frStandardFooter(this._report, this, {top: parseInt(this._html.style.top,10), left: left});
                break;
            default:
                if (this.debugging) {
                    console.error("fluentReports: Unknown type", this._type);
                }
        }
        return this._stockElement;
    }

    _resetTops(startId=0) {
        // We need to temporarily increase the report layout so we can move sections without shrinking any of them...
        let curHeight = parseInt(this._report.reportLayout.clientHeight,10);
        this._report.reportLayout.style.height = (curHeight+1000)+"px";

        // Lets start moving sections since we grew one of them...
        let top = this.frSections[startId].bottom;
        const len = this.frSections.length;
        for (let i=startId+1;i<len;i++) {
            this.frSections[i].top = top;
            top += this.frSections[i].height;
            this.frSections[i]._draggable.position();
        }

        // Fix the report layout height back to a real number
        let btm = this.frSections[len-1].bottom;
        if (curHeight < btm) {
            this._report.reportLayout.style.height = btm+"px";
        } else {
            this._report.reportLayout.style.height = curHeight+"px";
        }
    }

    _generateSave(results) {
        if (this._groupName !== '') {
            let group;

            // Is this a subReport or Detail?
            if (this._type === 3 && this._fromGroup === false) {
                let foundReport;
                for (let i = 0; i < this._report._saveTemporaryData.reports.length; i++) {
                    if (this._dataSet === this._report._saveTemporaryData.reports[i].dataSet ) {
                        foundReport = this._report._saveTemporaryData.reports[i];
                        break;
                    }
                }

                if (foundReport) {
                    results.subReport = foundReport;
                    foundReport.type = 'report';
                    if (!Array.isArray(foundReport.detail)) {
                        foundReport.detail = [];
                    }
                } else {
                    results.subReport = {type: 'report', detail: []};
                    this._report._saveTemporaryData.reports.push(results.subReport);
                }

                this._report._copyProperties(this._report._subReports[this._groupName], results.subReport, ["type", "dataType", "data", "fontSize", "dataSet"]);

                // Switch to the subReport
                results = results.subReport;
            } else {
                let found = false;
                for (let i=0;i<this._report._saveTemporaryData.reports.length;i++) {
                    if (this._dataSet === this._report._saveTemporaryData.reports[i].dataSet) {
                        results = this._report._saveTemporaryData.reports[i];
                        found = true;
                        break;
                    }
                }

                if (!found) {
                    results = {dataSet: this._dataSet};
                    this._report._saveTemporaryData.reports.push(results);
                }

                // This is a group
                if (!results.groupBy) {
                    results.groupBy = [];
                }
                for (let i = 0; i < results.groupBy.length; i++) {
                    if (results.groupBy[i].groupOn === this._groupName) {
                        group = results.groupBy[i];
                        break;
                    }
                }
                if (!group) {
                    group = {type: 'group', groupOn: this._groupName};
                    results.groupBy.push(group);
                }
                // Switch to the group level, before we continue on below....
                results = group;
            }
        }

        // Ok now lets process which type of section this is
        let type = '';
        switch (this._title) {
            case 'Detail':
                type = 'detail';
                break;
            case 'Page Header':
                type = 'pageHeader';
                break;
            case 'Title Header':
                type = 'titleHeader';
                break;
            case 'Header':
                type = 'header';
                break;
            case 'Footer':
                type = 'footer';
                break;
            case 'Page Footer':
                type = 'pageFooter';
                break;
            case 'Final Summary':
                type = 'finalSummary';
                break;
            default:
                if (this.debugging) {
                    console.error("Unknown Section type", this._title);
                }
        }
        if (!Array.isArray(results[type])) {
            results[type] = [];
        }
        let group = results[type];
        this._saveSectionInfo(group);

    }

    _saveSectionInfo(results) {
        if (this._calculations.length) {
            for (let i=0;i<this._calculations.length;i++) {
                results.push(shallowClone(this._calculations[i]));
            }
        }
        if (this._functions.length) {
            for (let i=0;i<this._functions.length; i++) {
                results.push(shallowClone(this._functions[i]));
            }
        }
        for (let i=0;i<this._children.length;i++) {
            let child = {};
            results.push(child);
            if (this._children[i] instanceof frStandardHeader || this._children[i] instanceof frStandardFooter) {
                child.type = "raw";
                this._children[i]._saveProperties(child);
            } else {
                this._children[i]._generateSave(child);
            }
        }
    }

    _parseSection(data) {
        let top = (this._children.length * 32) + 6;
        if (top+50 >= this.height) { this.height = top + 50; }

        switch (data.type) {
            case 'raw':
                let stockElement = this.createStockElement();
                if (stockElement) {
                    this._usingStock = true;
                    stockElement._parseElement(data);
                } else {
                    console.error("Create stock element is null", data);
                }
                break;

            case 'print':
                let printElement;
                if (data.field) {
                    printElement = new frPrintField(this._report, this, {ztop: top});
                } else if (data.text) {
                    printElement = new frPrintLabel(this._report, this, {ztop: top});
                } else if (data.function) {
                    printElement = new frPrintFunction(this._report, this, {ztop: top});
                } else if (data.total) {
                    printElement = new frPrintDynamic(this._report, this, {ztop: top, type: 'total'});
                } else if (data.calculation) {
                    printElement = new frPrintDynamic(this._report, this, {ztop: top, type: 'calculation'});
                } else if (data.variable) {
                     printElement = new frPrintDynamic(this._report, this, {ztop: top, type: 'variable'});
                } else if (data.page) {
                    printElement = new frPrintPageNumber(this._report, this, {});
                }
                printElement._parseElement(data);
                break;

            case 'band':
                let bandElement = new frBandElement(this._report, this, {ztop: top});
                bandElement._parseElement(data);
                break;

            case 'bandLine':
                let bandLineElement = new frBandLine(this._report, this, {});
                bandLineElement._parseElement(data);
                break;


            case 'image':
                let imageElement = new frImage(this._report, this, {});
                imageElement._parseElement(data);
                break;

            case 'shape':
                let shapeElement = new frSVGElement(this._report, this, {});
                shapeElement._parseElement(data);
                break;

            case 'newLine':
                const newLine = new frNewLine(this._report, this, {top: top});
                newLine._parseElement(data);
                break;

            case 'calculation':
                this._calculations.push(data);
                this.hasCalculations = true;
                break;

            case 'function':
                this._functions.push(data);
                this.hasFunctions = true;
                break;

            default:
                if (this.debugging) {
                    console.error("fluentReports: Unknown", data.type, "in _parseSection");
                }
        }
    }

    _generateTitle() {
        if (this._type === 3 /* Detail */) {
            return this._title + (this._groupName !== '' ? " (" + this._groupName +")" : '');
        }
        return this._title + (this._groupName !== '' ? " [" + this._groupName +"]" : '');
    }

    appendChild(child) {
        this._children.push(child);
        this._elementDiv.appendChild(child._html);
    }

    removeChild(child) {
        let idx = this._children.indexOf(child);
        if (idx >= 0) {
            this._children.splice(idx, 1);
        }
        this._elementDiv.removeChild(child._html);
    }

    clickFunctions() {
       this.UIBuilder.functionBrowse(this._functions, ( funcs ) => {
            this._functions = funcs;
            this.hasFunctions = funcs.length > 0;
            this._refreshProperties();
        });
    }

    clickCalcs() {
       this.UIBuilder.calculationBrowse(this._calculations, ( calcs ) => {
            this._calculations = calcs;
            this.hasCalculations = calcs.length > 0;
            this._refreshProperties();
        });
    }

    _refreshProperties() {
        this._report.showProperties(this, true);
   }

   get frSections() {
        return this._report.frSections;
   }

   get scale() {
        return this._report.scale;
   }
   
   get debugging() {
        return this._report.debugging;
   }

   get UIBuilder() {
        return this._report.UIBuilder;
   }
   
    constructor(report, options = {}) {
        this._report = report;
        
        // Add our section to the report tracking 
        this._sectionId = this.frSections.length;
        this.frSections.push(this);
        
        
        this._readOnly = false;
        this._uuid = _frItemUUID++;
        this._functions = [];
        this._hasFunctions = false;
        this._calculations = [];
        this._hasCalculations = false;
        this._fromGroup = options && options.fromGroup || false;

        this._children = [];

        this._type = options && options.type || 0;
        this._stockElement = null;
        this._fixedHeight = false;
        this._usingStock = false;
        this._groupName = options && options.group || '';
        this._properties = [
            {
                skip: this._type === 3 || this._groupName === '',
                type: 'display',
                field: 'groupName',
                title: "Grouping",
                display: this._generateDataSetView.bind(this)
            },
            {
                skip: this._type !== 3 || this._groupName === '',
                type: 'display',
                field: 'groupName',
                title: "Data Set",
                display: this._generateDataSetView.bind(this)
            },
            {type: "number", field: "height", functionable: false, default: 0},
            {type: "boolean", field: "fixedHeight", functionable: false, default: false},
            {type: 'display', field: 'hasFunctions', title: 'Functions', display: () => { return this._createSpan(this._hasFunctions, "\ue81f", this.clickFunctions.bind(this)); }},
            {type: 'display', field: 'hasCalculations', title: 'Calculations', display: () => { return this._createSpan(this._hasCalculations, "\uE824", this.clickCalcs.bind(this)); }}
        ];
        this._dataSet = options && options.dataSet || 0;
        if (this._type === 1 || this._type === 2) {
            this._properties.push({
                type: 'display',
                display: this._generateStockCheck.bind(this),
                title: "Standard " + (this._type === 1 ? "Header" : "Footer"),
                properties: this._getProps.bind(this)
            });
        }
        this._title = options.title || (this._type === 1 ? "Header" : (this._type === 2 ? "Footer" : "Detail"));

        let height = (options && options.height) || 70;
        let top;
        if (this._sectionId === 0) {
            top = 0;
        } else {
            top = this.frSections[this._sectionId - 1].bottom;
        }

        // Auto-resize report height if the size is bigger than the next section...
        if (top + height > this._report.reportLayout.clientHeight) {
            if (top + height > parseInt(this._report.reportLayout.style.minHeight, 10)) {
                this._report.reportLayout.style.height = (top + height) + "px";
            }
        }

        this._html = document.createElement("div");
        this._html.className = "frLineWrapper";
        this._html.style.top = top + "px";
        this._html.style.height = height + "px";
        this._html.style.position = "absolute";

        const table = document.createElement("table");
        table.className = "frElementTable";
        table.style.width = "100%";
        table.style.height = "100%";
        const tr = document.createElement("tr");
        tr.style.height = "18px";
        tr.className = "frTitleDiv";

        this._titleTD = document.createElement("td");
        tr.appendChild(this._titleTD);
        table.appendChild(tr);

        const tr2 = document.createElement("tr");
        const td2 = document.createElement("td");
        this._elementDiv = document.createElement("div");
        this._elementDiv.style.position = "relative";
        this._elementDiv.style.width = "100%";
        this._elementDiv.style.height = "100%";
        this._elementDiv.className = "frElementContainer";
        td2.appendChild(this._elementDiv);
        tr2.appendChild(td2);
        table.appendChild(tr2);

        this._titleSpan = document.createElement("span");
        this._titleSpan.innerText = this._generateTitle();
        this._titleSpan.className = "frLineText";
        this._titleTD.appendChild(this._titleSpan);

        this._optionSpan = document.createElement("span");
        this._optionSpan.className = "frLineIcon frIcon frHidden";
        this._optionSpan.style.position = "absolute";
        this._optionSpan.style.right = "1px";
        this._titleTD.appendChild(this._optionSpan);

        this._frLine = document.createElement("div");
        this._frLine.className = "frLine";
        this._frLine.style.position = "absolute";
        this._frLine.style.bottom = "0px";

        this._html.appendChild(table);
        this._html.appendChild(this._frLine);

        this._report.reportLayout.appendChild(this._html);

        // noinspection ES6ModulesDependencies,JSHint
        this._draggable = new PlainDraggable(this._frLine, {leftTop: true});
        this._draggable.handle = this._frLine;
        if (this.frSections.length > 1) {
//            this.frSections[this.frSections.length-2]._frLine.style.display = 'none';

            this.frSections[this.frSections.length-2]._draggable.handle = this._titleTD;
        }

        this._draggable.autoScroll = {target: this._report.reportLayout.parentElement};

        this._draggable.containment = this._report.reportLayout;

        this._draggable.onDragStart = this._onDragStart.bind(this);
        this._draggable.onDragEnd = this._onDragEnd.bind(this);
        this._draggable.onMove = () => {
            const rect = this._html.getBoundingClientRect();
            this._html.style.height = (this._draggable.rect.bottom - (rect.top + window.pageYOffset) )+ 'px';
            let top = (parseInt(this._html.style.height,10)+parseInt(this._html.style.top, 10));
            this._draggable.position();
            for (let i=this._sectionId+1;i<this.frSections.length;i++) {
                let next = this.frSections[i];
                next._html.style.top = top + "px";
                top += next.height;
                next._draggable.position();
            }

        };
    }

    _createSpan(value, code, func) {
        const span = document.createElement('span');
        if (value === true) {
            span.innerText = "Yes";
        } else {
            span.innerText = "No";
        }
        const innerSpan = document.createElement('span');
        innerSpan.style.position = "absolute";
        innerSpan.style.right = "4px";
        innerSpan.className = "frIcon frIconClickable";
        innerSpan.innerText = code;
        innerSpan.style.border = "solid black 1px";
        if (func) {
            innerSpan.addEventListener("click", func);
        }
        span.appendChild(innerSpan);

        return span;
    }

    get hasFunctions() {
        return this._hasFunctions;
    }

    set hasFunctions(val) {
        this._hasFunctions = !!val;
        this._resetLabelView();
    }

    get hasCalculations() {
        return this._hasCalculations;
    }
    set hasCalculations(val) {
        this._hasCalculations = !!val;
        this._resetLabelView();
    }

    _resetLabelView() {
        let text = "";
        if (this._hasFunctions) {
            // TODO do we want to make this a <a> to toggle the function system?
            text += " \uE81F ";
        }
        if (this._hasCalculations) {
            text += " \uE824 ";
        }

        this._optionSpan.innerHTML = text;
        this._optionSpan.classList.toggle("frHidden", text.length === 0);
    }

    _generateDataSetView() {
        const span = document.createElement('span');
        span.innerText = this._groupName;
        span.style.fontWeight = "bolder";
        return span;
    }

    // noinspection JSUnusedGlobalSymbols
    _generateDataSetSelection() {
        const selectList = document.createElement("select");
        selectList.className = "frSelect";
        const fields = this._report.reportFields;
        let group;

        if (this._dataSet === 0) {
            group = document.createElement("optgroup");
            group.label = "Primary Data";
            selectList.appendChild(group);
            for (let i = 0; i < fields.primary.length; i++) {
                const option = new Option(fields.primary[i]);
                if (this._field === fields.primary[i]) {
                    option.selected = true;
                }
                group.appendChild(option);
            }
        } else {
            if (fields['level' + this._dataSet].length > 0) {
                group = document.createElement("optgroup");
                group.label = fields.titles[this._dataSet];
                for (let j = 0; j < fields['level' + this._dataSet].length; j++) {
                    const option = new Option(fields['level' + this._dataSet][j]);
                    if (this._field === fields['level' + this._dataSet][j]) {
                        option.selected = true;
                    }
                    group.appendChild(option);
                }
                selectList.appendChild(group);
            }
        }

        const variables = this._report.reportVariables;
        if (variables != null) {
            group = document.createElement("optgroup");
            group.label = "- Variables -";
            let count=0;
            for (let key in variables) {
                if (!variables.hasOwnProperty(key)) { continue; }
                count++;
                const option = new Option(key);
                if (this._field === key) {
                    option.selected = true;
                }

                group.appendChild(option);
            }
            if (count) {
                selectList.appendChild(group);
            }
        }

        const calculations = this._report.reportCalculations;
        if (calculations.length) {
            group = document.createElement("optgroup");
            group.label = "- Calculations -";
            for (let i=0;i<calculations.length;i++) {
                const option = new Option(calculations[i]);
                if (this._field === calculations[i]) {
                    option.selected = true;
                }
                group.appendChild(option);
            }
            selectList.appendChild(group);
        }

        return selectList;
    }

    _generateStockCheck() {
        let check = document.createElement("input");
        check.type = "checkbox";

        if (this._usingStock) {
            check.checked = true;
        }
        check.addEventListener("click", () => {
            this._usingStock = check.checked;
            if (this._usingStock) {
                this.createStockElement();
            } else if (this._stockElement) {
                this._stockElement.delete();
                this._stockElement = null;
            }
            this._report.showProperties(this, true);
        });
        return check;
    }

    _getProps() {
        let results = [];
        if (!this._usingStock) { return results; }
        results.push({type: 'button', title: 'Edit Standard ' + (this._type === 1 ? 'Header' : 'Footer'), click: () => {
                this._stockElement.select();
            }});
        return results;
    }

    _onDragStart() {

        let pageEnd = parseInt(this._report.reportScroller.clientHeight,10);
        if (this.frSections.length) {
            pageEnd = this.frSections[this.frSections.length - 1].bottom;
        }

        // Figure out the MIN-Size
        // First set top to be bottom of prior section plus a space to put an object into the section it...
        let top = 22;
        if (this._sectionId) {
            // Bottom of Prior section
            top = this.frSections[this._sectionId-1].bottom+22;
        }
        // Let top be to bottom of any children elements...
        for (let i=0;i<this._children.length;i++) {
            let newTop = this.top + this._children[i].top + this._children[i].elementHeight;
            if (newTop >= top) { top = newTop+5; }
        }

        // Now attempt to figure out the max size
        let currentHeight = parseInt(this._report.reportLayout.clientHeight, 10);

        // Add another 1000 pixels to bottom of report to allow close to endless scrolling....
        if (currentHeight < pageEnd + 1000) {
            currentHeight = pageEnd + 1000;
            this._report.reportLayout.style.height = currentHeight + "px";
        }

        let end = currentHeight-22 - this.top;
        for (let i=this._sectionId+1;i<this.frSections.length;i++) {
            end -= this.frSections[i].height;
        }
        this._report.sectionConstrainer.style.top = top+"px";
        this._report.sectionConstrainer.style.height = end+"px";

        // View the Section Containment
        //this._report.sectionConstrainer.style.left = "1px";
        //this._report.sectionConstrainer.style.width = "5px";
        //this._report.sectionConstrainer.style.backgroundColor = "green";

        this._draggable.containment = this._report.sectionConstrainer;

        this._draggable.position();
    }

    _onDragEnd() {
            // Reset bottom of report to be where the last section is at...
            if (this.frSections.length) {
                let bottom = this.frSections[this.frSections.length - 1].bottom;
                if (bottom < this._report._reportScroller.clientHeight) { bottom = this._report._reportScroller.clientHeight; }
                this._report.reportLayout.style.height = bottom + "px";
            }

            // Clear Containment after we are done dragging, so that scrolling doesn't break them
            this._draggable.containment = {top: 0, left: 0, width: 0, height: 0};
            this._draggable.containment = this._report.reportLayout;
            this._draggable.position();
            this._report.sectionConstrainer.style.top = "0px"; // jshint ignore:line
            this._report.sectionConstrainer.style.height = "0px";

            // Refresh Property panel
            this._report.showProperties(this, false);
    }


}



// ----------------------------------------- [ Elements ] ----------------------------------------------



/**
 * FluentReports Base Element
 */
class frElement { // jshint ignore:line
    
    constructor(report, parent /* , options */) {
        this._uuid = _frItemUUID++;
        this._report = report;
        this._parent = parent;
        this._html = null;
        this._draggable = null;
        this._locked = false;
        this._readonly = false;
        this._width = 0;
        this._height = 0;
        this._handlers = {};
        this._properties = [
            {type: 'number', field: 'top', default: 0, destination: "settings"},
            {type: 'number', field: 'left', default: 0, destination: "settings"},
            {type: 'string', field: 'width', default: 0, destination: "settings"},
            {type: 'number', field: 'height', default: 0, destination: "settings"}
            ];
        this.frElements.push(this);
    }
    
    get uuid() { return this._uuid; }
    get frElements() {
        return this._report.frElements;
    }
    get UIBuilder() {
        return this._report.UIBuilder;
    }

    get scale() {
        return this._report.scale;
    }

    get debugging() {
        return this._report.debugging;
    }

    get pageWidth() {
        return this._report.pageWidth;
    }

    /**
     * Delete this Element
     */
    delete() {
        if (this._report.currentSelected === this) {
            this.blur();
            this._report.showProperties(null);
        }
        this._parent.removeChild(this);
        let idx = this.frElements.indexOf(this);
        this.frElements.splice(idx, 1);
    }
    
    get properties() { return this._properties; }

    get draggable() { return this._draggable; }
    get html() { return this._html; }

    get top() { return parseInt(this._html.style.top,10); }
    set top(val) {
        let top = val;
        // We have to be below the header area
        if (typeof top !== 'number') { top = 0; }

        this._html.style.top = top+"px";
        this._resizeParentContainer(this.top);
    }

    get left() { // noinspection JSCheckFunctionSignatures
        return parseInt(parseInt(this._html.style.left, 10) / this.scale, 10);
    }
    set left(val) { this._html.style.left = (val * this.scale)+"px"; }

    get width() { return this._width; }
    set width(val) {
        if (val == null || val === "" || val === "auto" || val === "0px") { val = 0; }
        this._width = val;
        val = this._parseSize(val);
        if (val === 0 || val === "0") {
            this._html.style.width = "";
        } else if (val < 10) {
            this._html.style.width = "10px";
        } else {
            this._html.style.width = (val * this.scale)+"px";
        }
    }

    get locked() { return this._locked; }
    set locked(val) {
        this._locked = !!val;
        this._draggable.disabled = this._locked | this._readonly; // jshint ignore:line
    }

    get readonly() {
         return this._readonly;
    }

    set readonly(val) {
        // TODO: Disable all changes, readonly is only a place holder currently
        this._readonly = val;
        this._draggable.disabled = this._locked | this._readonly; // jshint ignore:line
    }

    get height() { return this._height; }
    set height(val) {
        if (val == null || val === "undefinedpx" || val === "" || val === "auto" || val === "0px") { val = 0;}
        this._height = parseInt(val,10);
        if (val === 0 || val === "0") {
            this._html.style.height = "";
        } else {
            this._html.style.height = (val * this.scale)+"px";
        }

        // Resize Section in case it is too small
        this._resizeParentContainer(this.top);
    }

    get elementHeight() {
        let clientHeight = parseInt(this._html.clientHeight,10) / this.scale;
        return this._height > clientHeight ? this._height : clientHeight;
    }

    // noinspection JSUnusedGlobalSymbols
    get elementWidth() {
        let clientWidth = parseInt(this._html.clientWidth,10) / this.scale;
        return this._width > clientWidth ? this._width : clientWidth;
    }


    on(event, handler) {
        if (typeof this._handlers[event] === 'undefined') {
            this._handlers[event] = [];
        }
        this._handlers[event].push(handler);
    }

    off(event, handler) {
        if (handler == null) {
            this._handlers[event] = [];
        } else {
            for (let i=0;i<this._handlers[event].length; i++) {
                if (this._handlers[event][i] === handler) {
                    this._handlers[event].splice(i, 1);
                    break;
                }
            }
        }
    }

    blur() {
        this._html.blur();
        this._blur(this);
    }

    focus() {
        this._focus();
    }

    select() {
        this._selected();
    }

    _refreshProperties(){
        this._report.showProperties(this, true);
    }

    _parseSize(val) {
        if (val == null) { return 0; }
        if (typeof val === 'number') { return val; }
        if (val.indexOf("%") > 0) {
            let temp = parseInt(val, 10) / 100;
            return this.pageWidth * temp;
        }
        return val;
    }

    _generateSave(prop) {
        this._saveProperties(prop);
    }

    _parseElement(data) {
        console.error("Element: ParseElement should be overridden", data);
    }

    _copyProperties(src, dest, props) {
        if (src == null) { return; }
        for (let i=0;i<props.length;i++) {
            if (typeof src[props[i]] !== 'undefined') {
                dest[props[i]] = src[props[i]];
            }
            if (src.settings && typeof src.settings[props[i]] !== 'undefined') {
                dest[props[i]] = src.settings[props[i]];
            }
        }
    }

    _notify(eventName, event) {
        if (this._handlers[eventName]) {
            for (let i=0;i<this._handlers[eventName].length;i++) {
                this._handlers[eventName][i](event);
            }
        }
    }

    _generateSnapping() {
        let targets=[];
        let secs = this._parent.frSections;
        for (let i=0;i<secs.length;i++) {
            targets.push({y: secs[i].top, side: 'end'});
            targets.push({y: secs[i].top+20, side: 'start'});
        }
        if (this._report.gridSnapping.snapping) {
            targets.push({step: this._report.gridSnapping.size});
        }
        return  {
            targets: targets,
            gravity: 5,
        };
    }

    _assignStandardHandlers(object, listeners) {
        // noinspection ES6ModulesDependencies
        this._draggable = new PlainDraggable(object, {leftTop: true});
        //this._draggable.autoScroll = {target: document.getElementById("frReport")};
        this._draggable.containment = this._parent.elementContainer;

        this._draggable.onDragStart = () => {
            if (this._locked || this._readonly) { return; }

            this._draggable.containment = this._report.reportLayout;
            this._draggable.snap = this._generateSnapping();
        };

        this._draggable.onDragEnd = () => {
            if (this._locked || this._readonly) { return; }
            let newSection = this._parent.sectionId;
            if (this.top < 0) {
                if (this.top < -17) {
                    // Went into another section....
                    newSection = this._report._getSectionIn(this._parent.elementContainerTop + this.top);
                } else {
                    // If we go into the Header, we just want to reset back to 0
                    this.top = 0;
                }
            } else if (this.top >= this._parent.elementContainerHeight) {
                newSection = this._report._getSectionIn(this._parent.elementContainerTop + this.top+1);
                if (newSection === 0) { newSection = this.frSections.length-1; }
            }
            if (newSection !== this._parent.sectionId) {
                // We are grabbing the original _parent.top
                let top = this._parent.top +  this.top;

                this._parent.removeChild(this);
                let sec = this._report._getSection(newSection);
                sec.appendChild(this);
                this._parent = sec;

                // We are now subtracting the NEW _parent.top
                top -= this._parent.top;

                // In case dropped in header
                if (top < 0) { top = 0;}

                // Position the element
                this.top = top;
            } else {
                // Moved into the header
                if (this.top < 0) {
                    this.top = 0;
                }
            }
            // Resize Section in case it is too small
            this._resizeParentContainer(this.top);

            this._draggable.position();

            this._report.showProperties(this, false);

            // While the object is at rest; we want to force it to stay inside its section
            //this._draggable.containment = this._parent._html;
        };

        if (listeners == null || (listeners & 1) === 1) { // jshint ignore:line
            object.addEventListener("click", this._clickHandler.bind(this));
        }
        if (listeners == null || (listeners & 2) === 2) { // jshint ignore:line
            object.addEventListener("dblclick", this._dblClickHandler.bind(this));
        }

        if (listeners == null || (listeners & 4) === 4) { // jshint ignore:line
            object.addEventListener("blur", this._blur.bind(this));
        }

        if (listeners == null || (listeners & 8) === 8) { // jshint ignore:line
            object.addEventListener("mousedown", this._mouseDown.bind(this));
        }

        return this._draggable;
    }

    _resizeParentContainer(top) {
        if ((this.elementHeight * this.scale) + top > this._parent.elementContainerHeight) {
            this._parent.elementContainerHeight = ((this.elementHeight * this.scale) + top);
            this._parent._draggable.position();
        }
    }

    _mouseDown() {
        this._selected();
    }

    _blur(args) {
        this._report.currentSelected = null;
        this._html.classList.remove("frSelected");

        if (this._handlers.blur && args !== this) {
            this._notify('blur', args);
        }
    }

    _dblClickHandler(args) {
        if (this._handlers.dblclick) {
            this._notify('dblclick', args);
        } else {
            this._focus();
        }
    }

    _clickHandler(args) {
        if (this._handlers.click && this._handlers.click.length) {
            this._notify('click', args);
        } else {
            // We don't want the reportLayout to see this click event; as it will cancel the selection...
            args.stopPropagation();

            this._selected();
        }
    }

    _focus() {
        this._selected();
        this._html.focus();
    }

    _selected() {
        if (this._report.currentSelected !== this && this._report.currentSelected != null) {
            this._report.currentSelected.blur();
        }
        this._report.showProperties(this, true);
        this._report.currentSelected = this;
        this._html.classList.add("frSelected");
    }


    _addProperties(arr, insert=true) {
        if (insert === true) {
            if (Array.isArray(arr)) {
                this._properties = arr.concat(this._properties);
            } else {
                this._properties.unshift(arr);
            }
        } else {
            if (Array.isArray(arr)) {
                this._properties = this._properties.concat(arr);
            } else {
                this._properties.push(arr);
            }
        }
    }

    _saveProperties(props, ignore=[]) {
        for (let i=0;i<this._properties.length;i++) {
            const curProp = this._properties[i];
            if (curProp.field) {
                // Check to see if we passed in this field to be ignored by a descendant
                if (ignore.indexOf(curProp.field) >= 0) { continue; }

                // If the item is undefined, then we don't bother saving it.
                if (typeof this[curProp.field] === 'undefined') { continue; }

                // Check to see if the field has the default value
                if (typeof curProp.default !== 'undefined' && curProp.default === this[curProp.field]) { continue; }

                // Check to see if we have a destination override
                if (typeof curProp.destination !== 'undefined') {
                    // Check to see if the destination override is set to false; meaning we don't save it.
                    if (curProp.destination === false) { continue; }

                    // Ok, use the destination override to save it
                    if (typeof props[curProp.destination] === 'undefined') {
                        props[curProp.destination] = {};
                    }
                    props[curProp.destination][curProp.field] = this[curProp.field];
                } else {
                    // Use the normal save location...
                    props[curProp.field] = this[curProp.field];
                }
            }
        }
    }

    _deleteProperties(arr) {
        if (Array.isArray(arr)) {
            for (let i=0;i<arr.length;i++) {
                let idx = this._properties.indexOf(arr[i]);
                if (idx < 0) {
                    for (let j=0;j<this._properties.length && idx < 0;j++) {
                        if (this._properties[j].field === arr[i]) {
                            idx = j;
                        }
                    }
                }
                if (idx >= 0) {
                    this._properties.splice(idx, 1);
                }
            }

        } else {
            let idx = this._properties.indexOf(arr);
            if (idx >= 0) {
                this._properties.splice(idx, 1);
            }
        }
    }
}

class frTitledElement extends frElement {
    constructor(report, parent, options = {}) {
        super(report, parent, options);

        this._html = document.createElement("div");
        this._html.className = "frTitledElement " + (options && options.className  || '');

        let top = options && options.top || 0;
        if (typeof top !== 'number' || top < 0) { top = 0; }

        this._html.style.top = top+"px";
        this._html.style.left = (options && options.left+"px") || "0px";
        this._html.style.position = 'absolute';

        this._elementTitle = document.createElement("span");
        this._elementTitle.innerText = options && options.elementTitle || "Title";
        this._elementTitle.className = "frTitledLabel";
        this._elementTitle.style.maxHeight = "10px";
        this._elementTitle.style.overflow = "hidden";
        this._html.appendChild(this._elementTitle);

        if (options && options.child) {
            this._html.appendChild(options.child);
        }

        parent.appendChild(this);
        this._assignStandardHandlers(this._html, options && options.handlers);
    }

    get elementTitle() { return this._elementTitle.innerText; }
    set elementTitle(val) { this._elementTitle.innerText = val; }
}

class frSVGElement extends frTitledElement { // jshint ignore:line
    constructor(report, parent, options = {}) {
        if (typeof options.elementTitle === 'undefined') {
            options.elementTitle = "Drawing";
        }
        super(report, parent, options);
        this.width = (options && options.width) || 50;
        this.height = (options && options.height) || 50;
        this._shape = (options && options.shape) || "line";
        this._radius = (options && options.radius) || 50;

        this._svgRoot = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this._svgRoot.style.width = (this.width * this.scale).toString();
        this._svgRoot.style.height = (this.height * this.scale).toString();
        this._html.appendChild(this._svgRoot);
        this.setupShape();

        this._addProperties([
            {type: 'select', field: "shape", display: this.createSelect.bind(this), destination: 'settings'},
            {type: 'number', field: 'radius', default: 0, destination: 'settings'}
        ]);
    }

    _saveProperties(props, ignore = []) {
        super._saveProperties(props, ignore);
        props.type = 'shape';
    }

    setupShape() {
        if (this._svg) {
            this._svgRoot.removeChild(this._svg);
            this._svg = null;
        }
        switch (this._shape) {
            case 'line':
                this._svg = document.createElementNS("http://www.w3.org/2000/svg", 'line');
                this._svg.setAttribute("x1","0");
                this._svg.setAttribute("y1","3");
                this._svg.setAttribute("x2", (this.width * this.scale).toString());
                this._svg.setAttribute("y2", (3+(this.height * this.scale)).toString());
                break;
            case 'box':
                this._svg = document.createElementNS("http://www.w3.org/2000/svg", 'rect');
                break;
            case 'circle':
                this._svg = document.createElementNS("http://www.w3.org/2000/svg", 'circle');

                const midY = Math.floor((this.height * this.scale ) / 2);
                const midX = Math.floor((this.width * this.scale) / 2);
                this._svg.setAttribute("cx",midX.toString());
                this._svg.setAttribute("cy",midY.toString());
                this._svg.setAttribute("r",this.radius.toString());
                break;

        }
        if (!this._svg) {
            console.error("fluentReportGenerator: SVG shape is not configured in setupShape, set to: ", this._shape);
            return;
        }

        this._svg.style.stroke = "#000000";
        this._svg.style.strokeWidth = "2px";
        this._svg.style.fill = "none";
        this._svg.style.width = (this.width * this.scale).toString();
        this._svg.style.height = (this.height * this.scale).toString();
        this._svgRoot.appendChild(this._svg);
    }

    get radius() {
        return this._radius;
    }

    set radius(val) {
        this._radius = val;
        if (this._svg && this._shape === "circle") {
            this._svg.setAttribute("r",this.radius.toString());
        }
    }

    get shape() {
        return this._shape;
    }

    set shape(val) {
        if (val !== this._shape) {
            this._shape = val;
            this.setupShape();
        }
    }

    get width() {
        return super.width;
    }
    set width(val) {
        super.width = val;
        if (this._svg) {
            this._svgRoot.style.width = (this._width * this.scale).toString();
            this._svg.style.width = (this._width * this.scale).toString();
            if (this._shape === "line") {
                this._svg.setAttribute("x2", (this.width * this.scale).toString());
            }
        }
    }

    get height() {
        return super.height;
    }
    set height(val) {
        super.height = val;
        this._html.style.height = (5+(this.height * this.scale))+"px";
        if (this._svg) {
            this._svgRoot.style.height = (5 + (this.height * this.scale)).toString();
            this._svg.style.height = (5 + (this.height * this.scale)).toString();
            if (this._shape === "line") {
                this._svg.setAttribute("y2", (3 + (this.height * this.scale)).toString());
            }
        }
    }

    // SVG has extra 5 pixels, see height setter...
    get elementHeight() {
        return this.height+5;
    }

    createSelect() {
        const curShape = this._shape;
        let selectGroup = document.createElement('select');

        let item = new Option("Line", "line");
        if (curShape === "line") {
            item.selected = true;
        }
        selectGroup.appendChild(item);

        item = new Option("Box", "box");
        if (curShape === "box") {
            item.selected = true;
        }
        selectGroup.appendChild(item);

        item = new Option("Circle", "circle");
        if (curShape === "circle") {
            item.selected = true;
        }
        selectGroup.appendChild(item);

        return selectGroup;
    }

}

class frTitledLabel extends frTitledElement { // jshint ignore:line
    constructor(report, parent, options = {}) {
        super(report, parent, options);

        this._text = document.createElement("div");
        this._text.innerText = options && options.label || "Label";
        this._html.appendChild(this._text);
    }

    get width() {
        return super.width;
    }
    set width(val) {
        super.width = val;
        this._text.style.width = this._html.style.width;
    }

    get height() {
        return super.height;
    }
    set height(val) {
        super.height = val;
        this._text.style.height = this._html.style.height;
    }

    get label() { return this._text.innerText; }
    set label(val) { this._text.innerText = val; }
}

class frStandardHeader extends frTitledLabel { // jshint ignore:line
    constructor(report, parent, options = {}) {
        options.elementTitle = "Standard Header";
        options.handlers = 13;
        options.label = "[ Report ]";
        super(report, parent, options);
        this._title = 'Report';
        this._addProperties({type: 'string', field: 'title'});
        this._deleteProperties(['top', 'left', 'width', 'height']);
//        this._draggable.containment = parent._html;
        this.locked = true;
    }

    get title() { return this._title; }
    set title(val) {
        this._title = val;
        this.label = "[ "+val+" ]";
    }

    _saveProperties(props) {
            props.values = [this.title];
    }
    _parseElement(data) {
        this.title = data.values[0] || "Report";
    }

    delete() {
        if (this._inDelete) { return; }
        this._inDelete = true;
        super.delete();
        this._parent.usingStock = false;
        this._inDelete = false;
    }
}

// TODO: Maybe Footer should be a descendant of Band?
class frStandardFooter extends frTitledLabel { // jshint ignore:line
    constructor(report, parent, options = {}) {
        options.elementTitle = "Standard Footer";
        options.handlers = 13;
        options.label = "[ Report ]";
        super(report, parent, options);
        this._title = "Report";
        this._totals = [];
        this._addProperties([{type: 'text', field: 'title'}]);
        this._addProperties(  {type: 'button', field: 'totals', title: 'Totals', click: this._setTotals.bind(this), destination: false}, false);
        this._deleteProperties(['top', 'left', 'width', 'height']);
        this.locked = true;
//        this._draggable.containment = parent._html;
    }

    _setTotals() {

        console.log("Set Totals");
    }

    get title() { return this._title; }
    set title(val) {
        this._title = val;
        this.label = "[ "+val+" ]";
    }

    get totals() { return this._totals; }
    set totals(val) { this._totals = val;}

    _saveProperties(props) {
        if (this.title === "Band") {
            props.values = this.totals;
        } else {
            props.values = [this.title, this.totals[0][0], this.totals[2]];
        }
    }

    _parseElement(data) {
        if (Array.isArray(data.values[0])) {
            this.totals = data.values;
            this.title = "Band";
        } else {
            this.title = data.values[0] || "";
            this.totals = [[data.values[1]], -1, data.values[2]];
        }
    }

    delete() {
        if (this._inDelete) { return; }
        this._inDelete = true;
        super.delete();
        this._parent.usingStock = false;
        this._inDelete = false;
    }

}

class frNewLine extends  frTitledLabel { // jshint ignore:line
    get count() { return this._count; }
    set count(val) {
        this._count = parseInt(val, 10);
        this.label = "Lines: ("+this._count+")";
    }

    constructor(report, parent, options={}) {
        super(report, parent, options);
        this.count = 1;
        this.elementTitle = "New/Blank Line";
        this._deleteProperties(["top", "left", "width", "height"]);
        this._addProperties({type: 'number', field: "count", default: 1});
    }

    _saveProperties(props) {
        super._saveProperties(props);
        props.type = "newLine";
    }

    _parseElement(data) {
        if (data.count > 0) { this.count = data.count; }
    }
}

class frBandLine extends  frTitledLabel { // jshint ignore:line

    get thickness() { return this._thickness; }
    set thickness(val) {
        this._thickness = parseFloat(val);
        this.label = "----(auto-sized to prior printed band, thickness: "+this._thickness+"px)----";
    }


    constructor(report, parent, options={}) {
        super(report, parent, options);
        this._thickness = 1.0;
        this.elementTitle = "Band Line";
        this.label = "----(auto-width to prior printed band, thickness: 1.0px)----";
        this._deleteProperties(["top", "left", "width", "height"]);
        this._addProperties({type: 'number', field: "thickness", default: 0});

        super.width = "120px";
    }

    _saveProperties(props) {
        super._saveProperties(props);
        props.type = "bandLine";
    }

    _parseElement(data) {
        if (data.thickness > 0) { this.thickness = data.thickness; }
    }
}

class frImage extends frTitledElement { // jshint ignore:line
    constructor(report, parent, options={}) {
        super(report, parent, options);

        this._image = null;
        this._aspect = "size";
        this._align = "left";
        this._valign = "top";
        this._imgScale = 0;
        this.elementTitle = "Image";
        this._imgRoot = document.createElement('img');
        this._html.appendChild(this._imgRoot);

        this.width = (options && options.width) || 50;
        this.height = (options && options.height) || 50;

        this._addProperties([{type: 'file', click: this._dblClickHandler.bind(this), title: "Set image", field: "image", default: null},
            {type: 'select', field: "aspect", default: "none", display: this._createFitSelect.bind(this), destination: 'settings'},
            {type: 'select', field: "align", default: "left", display: this._createAlignSelect.bind(this), destination: 'settings'},
            {type: 'select', field: "valign", default: "top", display: this._createVAlignSelect.bind(this), destination: 'settings'},
            {type: 'number', title: 'scale', field: 'imgScale', default: 0, destination: 'settings'}
        ]);
    }

    get imgScale() {
        return this._imgScale;
    }
    set imgScale(val) {
        this._imgScale = parseInt(val, 10);
    }

    get aspect() {
        return this._aspect;
    }
    set aspect(val) {
        this._aspect = val;
    }

    get align() {
        return this._align;
    }
    set align(val) {
        this._align = val;
    }

    get valign() {
        return this._valign;
    }
    set valign(val) {
        this._valign = val;
    }

    _createAlignSelect() {
        const curAlign = this._align;
        let selectGroup = document.createElement('select');

        let item = new Option("Left", "left");
        if (curAlign === "left") { item.selected = true; }
        selectGroup.appendChild(item);

        item = new Option("Right", "right");
        if (curAlign === "right") { item.selected = true; }
        selectGroup.appendChild(item);

        item = new Option("Center", "center");
        if (curAlign === "center") { item.selected = true; }
        selectGroup.appendChild(item);

        return selectGroup;
    }

    _createVAlignSelect() {
        const curAlign = this._valign;
        let selectGroup = document.createElement('select');

        let item = new Option("Top", "top");
        if (curAlign === "top") { item.selected = true; }
        selectGroup.appendChild(item);

        item = new Option("Center", "center");
        if (curAlign === "center") { item.selected = true; }
        selectGroup.appendChild(item);

        item = new Option("Bottom", "bottom");
        if (curAlign === "bottom") { item.selected = true; }
        selectGroup.appendChild(item);

        return selectGroup;
    }


    _createFitSelect() {
        const curAlign = this._aspect;
        let selectGroup = document.createElement('select');

        let item = new Option("None", "none");
        if (curAlign === "none") { item.selected = true; }
        selectGroup.appendChild(item);

        item = new Option("Size", "size");
        if (curAlign === "size") { item.selected = true; }
        selectGroup.appendChild(item);

        item = new Option("Scale", "scale");
        if (curAlign === "scale") { item.selected = true; }
        selectGroup.appendChild(item);

        item = new Option("Fit", "fit");
        if (curAlign === "fit") { item.selected = true; }
        selectGroup.appendChild(item);

        item = new Option("Cover", "cover");
        if (curAlign === "cover") { item.selected = true; }
        selectGroup.appendChild(item);

        return selectGroup;
    }


    _dblClickHandler() {
        this.UIBuilder.fileEditor(this._image, [".jpg",".jpeg",".png"], false,(val) => {
            this.image = val;
        });
    }

    get elementHeight() {
        return this.height + 5;
    }

    get width() {
        return super.width;
    }
    set width(val) {
        super.width = val;
        this._imgRoot.style.width = (super.width * this.scale) + "px";
    }
    get height() {
        return super.height;
    }
    set height(val) {
        super.height = val;
        this._imgRoot.style.height = (super.height * this.scale) + "px";
    }

    get image() {
        return this._image;
    }
    set image(val) {
        this._image = val;
        this._imgRoot.src = val;
    }

    _saveProperties(props) {
        super._saveProperties(props);
        props.type = "image";
    }

    _parseElement(data) {
        return super._parseElement(data);
        // None Needed?
    }
}

class frPrint extends frTitledLabel {
    constructor(report, parent, options={}) {
        super(report, parent, options);
        this._x = 0;
        this._y = 0;
        this._fontBold = false;
        this._fontItalic = false;
        this._fill = '';
        this._textColor = '';
        this._link = "";
        this._rotate = 0;
        this._align = 0;
        this._font = "times";
        this._text.style.overflow = "hidden";
//        this._text.style.wordBreak = "keep-all";
        this._text.style.whiteSpace = "nowrap";

        this._border = 0;
        this._wrap = false;

        // TODO: Do we need width, height?
        this._deleteProperties(["top", "left", "width", "height"]);

        this._addProperties(
            [
                {type: 'number', field: "x", default: 0, destination: "settings"},
                {type: 'number', field: "y", default: 0, destination: "settings"},
                {type: 'number', field: "addX", default: 0, destination: "settings"},
                {type: 'number', field: "addY", default: 0, destination: "settings"},
                {type: 'select', field: "font", default: "times", display: this._createFontSelect.bind(this), destination: 'settings'},
                {type: 'boolean', field: "fontBold", default: false, destination: "settings"},
                {type: 'boolean', field: "fontItalic", default: false, destination: "settings"},
                {type: 'string', field: "fill", functionable: true, default: "", destination: "settings"},
                {type: 'string', field: "textColor", functionable: true, default: "", destination: "settings"},
                {type: 'string', field: "link", functionable: true, default: "", destination: "settings"}, 
                {type: 'number', field: "border", default: 0, destination: "settings"},
                {type: 'number', field: 'rotate', default: 0, destination: 'settings'},
                {type: 'select', field: "align", default: "left", display: this._createAlignSelect.bind(this), destination: 'settings'},
                {type: 'boolean', field: "wrap", default: false, destination: "settings"}
                ]);
    }

    _createFontSelect() {
        return this.UIBuilder.createFontSelect(this.font);
    }

    _createAlignSelect() {
        const curAlign = this._align;
        let selectGroup = document.createElement('select');

        let item = new Option("Left", "left");
        if (curAlign === "left" || curAlign === "0" || curAlign === 0) { item.selected = true; }
        selectGroup.appendChild(item);

        item = new Option("Right", "right");
        if (curAlign === "right" || curAlign === "1" || curAlign === 1) { item.selected = true; }
        selectGroup.appendChild(item);

        item = new Option("Center", "center");
        if (curAlign === "center" || curAlign === "2" || curAlign === 2) { item.selected = true; }
        selectGroup.appendChild(item);

        return selectGroup;
    }


    get x() { return this._x; }
    set x(val) { this._x = parseInt(val, 10); }

    get y() { return this._y; }
    set y(val) { this._y = parseInt(val, 10); }


    get addX() { return this.left; }
    set addX(val) { this.left = val; }

    get addY() { return this.top; }
    set addY(val) { this.top = val; }


    //get addX() { return this._addX; }
    //set addX(val) { this._addX = parseInt(val, 10); }

    //get addY() { return this._addY; }
    //set addY(val) { this._addY = parseInt(val, 10); }

    get fontBold() { return this._fontBold; }
    set fontBold(val) { this._fontBold = !!val; }

    get fontItalic() { return this._fontItalic; }
    set fontItalic(val) { this._fontItalic = !!val; }

    get fill() { return this._fill; }
    set fill(val) { this._fill = val; }

    get textColor() { return this._textColor; }
    set textColor(val) { this._textColor = val; }

    get link() { return this._link; }
    set link(val) { this._link = val; }

    get border() { return this._border; }
    set border(val) { this._border = parseInt(val, 10); }

    get wrap() { return this._wrap; }
    set wrap(val) {
        this._wrap = !!val;
        if (this._text) {
           this._text.style.whiteSpace = this._wrap ? "normal" : "nowrap";
        }
    }

    get rotate() { return this._rotate; }
    set rotate(val) { this._rotate = !!val;}

    get align() { return this._align; }
    set align(val) {
        switch (val) {
            case 0:
            case "left":
                this._align = "left";
                break;

            case 1:
            case 'right':
                this._align = "right";
                break;

            case 2:
            case "center":
                this._align = "center";
                break;

            default:
                console.error("fluentReports: Unknown alignment", val);
        }
    }

    _parseElement(data) {
        this._copyProperties(data, this, ["x", "y", "addX", "addY", "fontBold", "fontItalic", "fill", "textColor",
            "link", "border", "wrap", "rotate", "align"]);
    }

    _saveProperties(props) {
        super._saveProperties(props);
        props.type = 'print';

    }


}

class frPrintLabel extends frPrint  { // jshint ignore:line
    constructor(report, parent, options = {}) {
        if (typeof options.elementTitle === 'undefined') {
            options.elementTitle = "Label";
        }
        super(report, parent, options);
        this._text.contentEditable = options && typeof options.contentEditable === 'undefined' ? "true" : options.contentEditable || "true";
        this.label = (options && options.label) || "Label";
        this._addProperties({type: "string", field: 'text', title: "label"});
    }

    get text() {
        return this.label;
    }
    set text(val) {
        this.label = val;
    }

    _saveProperties(props) {
        super._saveProperties(props);
    }

    _parseElement(data) {
        if (data.text) {
            this.label = data.text;
        }
        super._parseElement(data);
    }

    _focus(args) {
        super._focus(args);

        // Don't allow dragging because we want to do text editing...
        this._draggable.disabled = true;
    }


    _blur(args) {
        window.getSelection().removeAllRanges();
        const test = this.label;
        let reset = true;
        for (let i=0;i<test.length;i++) {
            const code = test.charCodeAt(i);
            if (code !== 13 && code !== 10 && code !== 32 && code !== 160) {
                reset = false; break;
            }
        }

        if (reset) {
            this.label = "Label";
        }

        // Re-enable Dragging, unless it is locked...
        this._draggable.disabled = (this._locked | this._readonly); // jshint ignore:line

        super._blur(args);
    }
}

class frPrintFunction extends frPrint { // jshint ignore:line
    constructor(report, parent, options = {}) {
        options.elementTitle = "Print Function";
        super(report, parent, options);
        this.name = '';
        this._async = false;
        this.function = options && options.function || '';
        this._addProperties(
            [{type: 'boolean', field: "async", default: false}, {type: 'string', field: "name"}]
        );
        this._addProperties({type: 'button', field: 'function', title: "Function Editor", click: this._dblClickHandler.bind(this)}, false);
    }

    get name() {
        return this._name;
    }
    set name(val) {
        this._name = val;
        if (this._function) {
            this.label = "{ FUNCTION: "+this._name+" }";
        } else {
            this.label = "{ function: "+this._name+" }";
        }
    }

    get function() { return this._function; }
    set function(val) {
        this._function = val;
        if (val == null || val.length === 0) {
            this._function = '';
            this.label = "{ function: "+this._name+" }";
        } else {
            this.label = "{ FUNCTION: "+this._name+" }";
        }
    }

    get async() {
        return this._async;
    }
    set async(val) {
        this._async = !!val;
    }

    // noinspection JSUnusedGlobalSymbols
    _runFunction() {
        try {
            const func = new Function('report', 'data', 'state', 'vars', 'done', this._function);   // jshint ignore:line
            let data = {};

            const fields = this._report.reportFields;

            for (let i=0;i<fields.primary.length;i++) {
                data[fields.primary[i]] = "data."+fields.primary[i];
            }

            for (let i=1;i<=fields.levels;i++) {
                if (fields['level'+i].length > 0) {
                    for (let j = 0; j < fields['level' + i].length; j++) {
                        data[fields['level'+i][j]] = "data."+fields['level'+i][j];
                    }
                }
            }

            let vars = {};
            const variables = this._report.reportVariables;
            if (variables != null) {
                for (let key in variables) {
                    if (!variables.hasOwnProperty(key)) { continue; }
                    vars[key] = "vars."+key;
                }
            }

            if (!this._async) {
                this.label = "{ FUNCTION: " + func({}, data, {}, vars);
            } else {
                func({}, data, {}, vars, (val) => {
                    this.label = "{ FUNCTION: " + val + " }";
                });
            }
        } catch (err) {
            console.error("fluentReports: Error in runFunction", err);
            this.label = "{ FUNCTION }";
        }
    }

    _dblClickHandler() {
       this.UIBuilder.functionEditor(this._function, null, this.async, this.skip, (result, name, isAsync, isSkip) => {
            let changed = false;
            if (this._function !== result) {
                this.function = result;
                changed = true;
                this.name = "Print Function";
            }
            if (this.async !== isAsync) {
                this.async = isAsync;
                changed = true;
            }
            if (this.skip !== isSkip) {
                this.skip = isSkip;
                changed = true;
            }
            if (changed) {
                this._report.showProperties(this, true);
            }
        });
    }

    _saveProperties(props) {
        super._saveProperties(props);
        props.function = {
            function: this._function, type: "function"
        };
        this._copyProperties(this, props.function, ['async', 'name', 'function']);
    }


    _parseElement(data) {
        this._copyProperties(data.function, this, ['async', 'name', 'function']);
        super._parseElement(data);
    }
}

class frPrintField extends frPrint { // jshint ignore:line
    constructor(report, parent, options = {}) {
        options.elementTitle = "Data Field";
        super(report, parent, options);
        this.field = options && options.field || 'Unknown';
        this._addProperties({type: 'select', title: 'field', field: 'field', display: this._generateDataFieldSelection.bind(this)});
    }

    _generateDataFieldSelection() {
        return this.UIBuilder.createDataSelect(this._report, this._field, 3);
    }

    get field() { return this._field; }
    set field(val) {
        this._field = val;
        this.label = val;
    }


    _dblClickHandler() {
      this.UIBuilder.dataFieldEditor(this._generateDataFieldSelection(), (value) => {
            if (this.field !== value) {
                this.field = value;
                this._report.showProperties(this, true);
            }
        });

    }

    _parseElement(data) {
        if (data.field) {
            this.field = data.field;
        }
        super._parseElement(data);
    }
}

class frPrintPageNumber extends frPrintLabel { // jshint ignore:line
    constructor(report, parent, options = {}) {
        options.elementTitle = "Page Number";
        super(report, parent, options);
        this.header = options && options.header;
        this.footer = options && options.footer;
        this.page = (options && options.page) || "Page {0} or {1}";
        this._addProperties({type: "string", field: 'page'});
        this._deleteProperties(["label"]);

        this._addProperties([{type: "boolean", field: 'header', default: false}, {type: "boolean", field: 'footer', default: false}]);
    }

    get page() {
        return this.label;
    }

    set page(val) {
        this.label = val;
    }

    _saveProperties(props) {
        super._saveProperties(props);
    }

    _parseElement(data) {
        if (data.page) {
            this.page = data.page;
        }
        if (data.header) {
            this.header = data.header;
        }
        if (data.footer) {
            this.footer = data.footer;
        }
        super._parseElement(data);
    }


}

class frPrintDynamic extends frPrint { // jshint ignore:line
    constructor(report, parent, options = {}) {
        options.elementTitle = "Dynamic Field";
        super(report, parent, options);
        this.type = options && options.type || 'variable';
        this.other = options && options[this._type] || '-unset-';

        this._addProperties([
            {type: 'select', title: 'type', field: 'type', onchange: this._refreshProperties.bind(this), display: this._generateTypeSelection.bind(this)},
            {type: 'select', title: 'field', field: 'other', display: this._generateDataFieldSelection.bind(this)}
        ]);
    }

    _refreshProperties() {
        // TODO: Maybe get the first valid option of the new type?
        this.other = "-unset-";
        super._refreshProperties();
    }

    get type() { return this._type; }
    set type(val) {
        this._type = val;
        this._elementTitle.innerText = val;
    }

    get other() { return this._total; }
    set other(val) {
        this._other = val;
        this.label = val;
    }

    _generateTypeSelection() {
        const selectList = document.createElement("select");
        selectList.className = "frSelect";

        let option = new Option("variable");
        if (this.type === "variable") {
            option.selected = true;
        }
        selectList.appendChild(option);

        option = new Option("calculation");
        if (this.type === "calculation") {
            option.selected = true;
        }
        selectList.appendChild(option);

        option = new Option("total");
        if (this.type === "total") {
            option.selected = true;
        }
        selectList.appendChild(option);


        return selectList;
    }

    _generateDataFieldSelection() {
        let dataSets = 4;
        switch (this._type) {
            case 'variable':
                dataSets = 4; break;
            case 'calculation':
                dataSets = 8; break;
            case 'total':
                dataSets = 16; break;
        }
        return this.UIBuilder.createDataSelect(this._report, this._other, dataSets);
    }

    _dblClickHandler() {
       this.UIBuilder.dataFieldEditor(this._generateDataFieldSelection(), (value) => {
            if (this.other !== value) {
                this.other = value;
                this._report.showProperties(this, true);
            }
        });
    }

    _saveProperties(props) {
        super._saveProperties(props, ["other"]);
        props[this.type] = this.other;
    }


    _parseElement(data) {
        if (data.calculation) {
            this.type = "calculation";
            this.other = data.calculation;
        }
        else if (data.variable) {
            this.type = "variable";
            this.other = data.variable;
        }
        else if (data.total) {
            this.type = "total";
            this.other = data.total;
        }

        super._parseElement(data);
    }
}

class frBandElement extends frPrint { // jshint ignore:line
    get columns() { return this._columns; }
    set columns(val) {
        this._columns = parseInt(val, 10);
        this._fixColumns();
    }

    get suppression() { return this._suppression; }
    set suppression(val) {
        this._suppression = !!val;
        if (this._suppression) {
            this._table.style.border = "1px solid black";
        } else {
            this._table.style.border = "1px dot black";
        }
    }

    get bands() {
        return this._bands;
    }

    constructor(report, parent, options = {}) {
        options.elementTitle = "Band";
        super(report, parent, options);
        this._text.style.display="none";
        this._columns = 4;
        this._gridColumns = [];
        this._bands = [];
        this._suppression = false;

        this._table = document.createElement("table");
        this._table.className = "frBand";
        this._table.style.border = "1px solid black";
        this._table.style.borderCollapse = "collapse";


        this._tr = document.createElement("tr");
        this._table.appendChild(this._tr);
        this._fixColumns();

        this._html.appendChild(this._table);

        this._deleteProperties(['rotate']);
        this._addProperties([{type: 'boolean', field: 'suppression', default: false},
            {type: 'number', field: 'columns', destination: false}]);
        this._addProperties({type: 'button', title: 'Band Editor', click: () => { this._bandEditor(); }}, false);
    }

    _dblClickHandler() {
        this._bandEditor();
    }

    _bandEditor() {
       this.UIBuilder.bandBrowse(this._report, this._bands, (value) => {
            this._bands = value;
            this._columns = value.length;
            this._fixColumns();
            for (let i=0;i<this._bands.length;i++) {
                const td = this._getCell(i);
                td.innerText = this._getBandTitle(i);
                this._fixCellProps(td, this._bands[i]);
            }
        });
    }

    _fixColumns() {
            if (this._columns === this._gridColumns) { return;}
            if (this._columns > this._gridColumns.length) {
                for (let i = this._gridColumns.length; i < this._columns; i++) {
                    let td = document.createElement("td");
                    td.style.border = "1px dotted black";
                    td.innerText = this._getBandTitle(i);
                    this._gridColumns.push(td);
                    this._tr.appendChild(td);
                }
            } else {
                while (this._columns < this._gridColumns.length) {
                    let td = this._gridColumns.pop();
                    this._tr.removeChild(td);
                }
            }
    }

    _getBandTitle(index) {
        if (this._bands.length <= index || index < 0) { return "?????"; }
        let bnd = this._bands[index];
        if (bnd.text != null) { return bnd.text; }
        if (bnd.field != null) { return "data."+bnd.field; }
        if (bnd.calculation != null) { return "calc."+bnd.calculation; }
        if (bnd.variable != null) { return "var."+bnd.variable; }
        if (bnd.total != null) { return "total."+bnd.total; }
        if (bnd.function != null) { return "{ FUNCTION }"; }
        return "-???-";
    }

    _saveProperties(props) {
        super._saveProperties(props);
        props.type = "band";
        props.fields = [];

        // Save only what the minimum number of columns selected, or the minimum number of columns that exist...
        let count = Math.min(this.columns, this._bands.length);
        for (let i=0;i<count;i++) {
            props.fields.push(this._bands[i]);
        }
    }


    _parseElement(data) {
        const len = data.fields.length;
        this.columns = len;
        for (let i=0;i<len;i++) {
            this._handleBandCell(data.fields[i]);
        }
        this._copyProperties(data.settings, this, ["x", "y", "addX", "addY", "fontBold", "fontItalic", "fill", "textColor", "link", "border", "wrap"]);
    }

    _getCell(id) {
        return this._tr.children[id];
    }

    _handleBandCell(field) {
        const cellId = this._bands.length;
        this._bands.push(field);
        const td = this._getCell(cellId);
        td.innerText = this._getBandTitle(cellId);

        this._fixCellProps(td, field);
    }

    _fixCellProps(td, field) {
        td.style.width = (this._parseSize(field.width) * this.scale || 80) + "px";
        td.style.maxWidth = td.style.width;
        if (field.align != null) {
            switch(field.align) {
                case 1: // LEFT
                    td.style.textAlign = "left";
                    break;
                case 2:
                    td.style.textAlign = "center";
                    break;
                case 3:
                    td.style.textAlign = "right";
                    break;
            }
        }
        // TODO: Handle rest of properties
    }

}



class UI { // jshint ignore:line

    constructor(parent) {
        this._parent = parent;
    }
    
    destroy() {
        this._parent = null;
    }

    get hostElement() {
        return this._parent._frame;
    }

    variableValueEditor(name, value, ok, cancel) {
        const body = document.createElement('div');

        const nameDiv = document.createElement('div');
        const name1 = document.createElement('span');
        name1.innerText = "Variable name:";
        const variableName = document.createElement('input');
        variableName.value = name;
        nameDiv.appendChild(name1);
        nameDiv.appendChild(variableName);
        body.appendChild(nameDiv);

        const valueDiv = document.createElement('div');
        const value1 = document.createElement('span');
        value1.innerText = "Variable value:";
        const variableValue = document.createElement('input');
        variableValue.value = value;
        valueDiv.appendChild(value1);
        valueDiv.appendChild(variableValue);
        body.appendChild(valueDiv);

        let buttons = this.createButtons(["Ok", "Cancel"]);
        let btnContainer = document.createElement('div');
        btnContainer.appendChild(buttons[0]);
        btnContainer.appendChild(buttons[1]);
        body.appendChild(btnContainer);

        let d = new Dialog("Value Editor", body, this.hostElement);

        buttons[0].addEventListener('click', () => {
            d.hide();
            if (typeof ok === 'function') {
                ok(variableName.value, variableValue.value);
            }
        });
        buttons[1].addEventListener('click', () => {
            d.hide();
            if (typeof cancel === 'function') {
                cancel();
            }
        });
    }

    variableBrowse(variables, ok, cancel) {
        const body = document.createElement('div');
        const span = document.createElement('span');
        span.innerText = "Variables:";
        body.appendChild(span);
        body.appendChild(document.createElement('br'));
        const selectDiv = document.createElement('div');

        const select = document.createElement('select');
        select.style.border = "solid black 1px";
        select.style.margin = "5px";
        select.style.left = "5px";
        select.style.right = "5px";
        select.style.height = "200px";
        select.style.width = "200px";
        select.size = 10;
        const resultVariables = {};

        for (let key in variables) {
            if (!variables.hasOwnProperty(key)) {
                continue;
            }
            const option = new Option(key);
            select.appendChild(option);

            // Copy variables
            resultVariables[key] = variables[key];
        }

        selectDiv.appendChild(select);
        selectDiv.style.display = 'inline-block';
        body.appendChild(selectDiv);
        const valueDiv = document.createElement('div');
        valueDiv.margin = "5px";
        const valueTitle = document.createElement('span');
        valueTitle.innerText = 'Value: ';
        const valueValue = document.createElement('span');
        valueDiv.appendChild(valueTitle);
        valueDiv.appendChild(valueValue);
        select.addEventListener('change', () => {
            valueValue.innerText = resultVariables[select.value];
        });


        let addButtons =this.createButtons(["Add", "Edit", "Delete"], {width: "100px", marginTop: "5px"});
        let addBtnContainer = document.createElement('div');
        //addBtnContainer.style.display = ''
        addBtnContainer.style.padding = "5px";
        addBtnContainer.style.display = 'inline-block';
        addBtnContainer.style.verticalAlign = "top";
        addBtnContainer.appendChild(addButtons[0]);
        addBtnContainer.appendChild(document.createElement('br'));
        addBtnContainer.appendChild(addButtons[1]);
        addBtnContainer.appendChild(document.createElement('br'));
        addBtnContainer.appendChild(addButtons[2]);
        body.appendChild(addBtnContainer);

        body.appendChild(valueDiv);


        // Add
        addButtons[0].addEventListener("click", () => {
           this.variableValueEditor("", "", (name, value) => {
                if (name != null && name !== '') {
                    if (!resultVariables.hasOwnProperty(name)) {
                        select.appendChild(new Option(name));
                    }
                    resultVariables[name] = value;
                }
            });
        });

        // Edit
        addButtons[1].addEventListener("click", () => {
            let key = select.value;
           this.variableValueEditor(key, resultVariables[key], (name, value) => {
                if (name !== key) {
                    delete resultVariables[key];
                    select.options[select.selectedIndex].text = name;
                }
                valueValue.innerText = value;
                resultVariables[name] = value;
            });
        });

        // Delete
        addButtons[2].addEventListener("click", () => {
            if (select.selectedIndex >= 0) {
                let key = select.value;
                delete resultVariables[key];
                select.options[select.selectedIndex] = null;
                valueValue.innerText = '';
            }
        });



        let buttons = this.createButtons(["Ok", "Cancel"]);
        let btnContainer = document.createElement('div');
        btnContainer.appendChild(buttons[0]);
        btnContainer.appendChild(buttons[1]);
        body.appendChild(btnContainer);

        let d = new Dialog("Variables", body, this.hostElement);

        buttons[0].addEventListener('click', () => {
            d.hide();
            if (typeof ok === 'function') {
                ok(resultVariables);
            }
        });
        buttons[1].addEventListener('click', () => {
            d.hide();
            if (typeof cancel === 'function') {
                cancel();
            }
        });
    }

    groupsBrowse(groups, report, ok, cancel) {
        const body = document.createElement('div');
        const span = document.createElement('span');
        span.innerText = "Group By:";
        body.appendChild(span);
        body.appendChild(document.createElement('br'));
        const selectDiv = document.createElement('div');

        const select = document.createElement('select');
        select.style.border = "solid black 1px";
        select.style.margin = "5px";
        select.style.left = "5px";
        select.style.right = "5px";
        select.style.height = "200px";
        select.style.width = "200px";
        select.size = 10;
        let resultVariables = [];

        let tempFields = report.reportFields;

        const tempOptGroups = [];
        for (let i=0;i<tempFields.titles.length;i++) {
            const group = document.createElement("optgroup");
            group.label = tempFields.titles[i];
            tempOptGroups.push(group);
            select.appendChild(group);
        }

        for (let i=0;i<groups.length;i++) {
            const optGroup = tempOptGroups[groups[i].dataSet];
            const option = new Option(groups[i].name);
            optGroup.appendChild(option);
            resultVariables.push(shallowClone(groups[i]));
        }

        selectDiv.appendChild(select);
        selectDiv.style.display = 'inline-block';
        body.appendChild(selectDiv);


        let addButtons =this.createButtons(["Add", "Edit", "Delete", "\uE83B", "\uE83C"], {width: "100px", marginTop: "5px"});
        let addBtnContainer = document.createElement('div');
        //addBtnContainer.style.display = ''
        addBtnContainer.style.padding = "5px";
        addBtnContainer.style.display = 'inline-block';
        addBtnContainer.style.verticalAlign = "top";

        // Add Up/Down
        addButtons[3].style.width = "47px";
        addButtons[4].style.width = "47px";
        addBtnContainer.appendChild(addButtons[3]);
        addBtnContainer.appendChild(addButtons[4]);
        addBtnContainer.appendChild(document.createElement('br'));
        addBtnContainer.appendChild(document.createElement('br'));

        for (let i=0;i<3;i++) {
            addBtnContainer.appendChild(addButtons[i]);
            addBtnContainer.appendChild(document.createElement('br'));
        }

        body.appendChild(addBtnContainer);

        const rebuildGroups = () => {
            // Clear all Select->Options
           for (let i=0;i<tempOptGroups.length;i++) {
               while (tempOptGroups[i].children.length) { tempOptGroups[i].removeChild(tempOptGroups[i].children[0]); }
           }

           // Recreate all Select Options
           for (let i=0;i<resultVariables.length;i++) {
                const optGroup = tempOptGroups[resultVariables[i].dataSet];
                const option = new Option(resultVariables[i].name);
                optGroup.appendChild(option);
           }
        };

        // Move Up
        addButtons[3].addEventListener("click", () => {
            if (select.selectedIndex <= 0) { return; }
            let curIndex = select.selectedIndex;
            let curGroup = resultVariables[curIndex];
            let priorGroup = resultVariables[curIndex-1];
            if (priorGroup.dataSet !== curGroup.dataSet) {
                return;
            }

            // Move names in groups...
            let temp = priorGroup.name;
            priorGroup.name = curGroup.name;
            curGroup.name = temp;

            rebuildGroups();
            select.selectedIndex = curIndex-1;
        });

        // Move Down
        addButtons[4].addEventListener("click", () => {
            const curIndex = select.selectedIndex;
            if (curIndex < 0) { return; }

            if (curIndex >= resultVariables.length-1) { return; }

            let curGroup = resultVariables[curIndex];
            let nextGroup = resultVariables[curIndex+1];
            if (nextGroup.dataSet !== curGroup.dataSet) {
                return;
            }

            // Move names in groups...
            let temp = nextGroup.name;
            nextGroup.name = curGroup.name;
            curGroup.name = temp;

            rebuildGroups();
            select.selectedIndex = curIndex+1;
        });


        // Add
        addButtons[0].addEventListener("click", () => {
            const fields =this.createDataSelect(report, null , 3);
           this.dataFieldEditor(fields,(name, idx, dataSet) => {
                if (name != null && name !== '') {
                    let optGroup = tempOptGroups[dataSet];
                    let found = false;
                    for (let i=0;i<resultVariables.length;i++) {
                        if (resultVariables[i].dataSet === dataSet && resultVariables[i].name === name) {
                            found = true;
                            break;
                        }

                    }
                    if (!found) {
                        // Grab count before adding...
                        let count = optGroup.children.length;
                        optGroup.appendChild(new Option(name));
                        if (count === 0) {
                            // Move to very top
                            resultVariables.unshift({name: name, dataSet: dataSet});
                        } else if (dataSet === tempOptGroups.length-1) {
                            // Move to Bottom
                            resultVariables.push({name: name, dataSet: dataSet});
                        } else {
                            // Move somewhere inside array
                            let temp = resultVariables.splice(0, count);
                            temp.push({name: name, dataSet: dataSet});
                            resultVariables = temp.concat(resultVariables);
                        }
                    }
                }
            });
        });

        // Edit
        addButtons[1].addEventListener("click", () => {
            if (select.selectedIndex < 0) { return; }
            const fields =this.createDataSelect(report, select.value , 3);

           this.dataFieldEditor(fields, (name, idx, dataSet) => {
                let curIndex = select.selectedIndex;
                let curGroup = resultVariables[curIndex];

                // Check to see if already exists; if so -- we cancel the change...
                for (let i=0;i<resultVariables.length;i++) {
                    if (resultVariables[i].dataSet === dataSet && resultVariables[i].name === name) {
                        return;
                    }
                }

                if (dataSet !== curGroup.dataSet) {
                    resultVariables.splice(curIndex, 1);
                    curGroup.dataSet = dataSet;
                    curGroup.name = name;
                    let curOptGroup = tempOptGroups[dataSet];
                    // Move to very top
                    if (dataSet === 0 && curOptGroup.children === 0) {
                        resultVariables.unshift(curGroup);
                    }
                    /// Move to Very bottom
                    else if (dataSet === tempOptGroups.length-1) {
                        resultVariables.push(curGroup);
                    } else {
                        let offset = 0;
                        for (let i=0;i<resultVariables.length;i++) {
                            if (resultVariables[i].dataSet <= dataSet) { offset = i; }
                        }
                        if (offset === 0) {
                            resultVariables.unshift(curGroup);
                        } else if (offset === resultVariables.length-1) {
                            resultVariables.push(curGroup);
                        } else {
                            let temp = resultVariables.splice(0, offset);
                            temp.push(curGroup);
                            resultVariables = temp.concat(resultVariables);
                        }
                    }
                } else {
                    resultVariables[curIndex].name = name;
                }
                rebuildGroups();
            });
        });

        // Delete
        addButtons[2].addEventListener("click", () => {
            if (select.selectedIndex >= 0) {
                resultVariables.splice(select.selectedIndex, 1);
                rebuildGroups();
            }
        });



        let buttons =this.createButtons(["Ok", "Cancel"]);
        let btnContainer = document.createElement('div');
        btnContainer.appendChild(buttons[0]);
        btnContainer.appendChild(buttons[1]);
        body.appendChild(btnContainer);

        let d = new Dialog("Group data by", body, this.hostElement);

        buttons[0].addEventListener('click', () => {
            d.hide();
            if (typeof ok === 'function') {
                ok(resultVariables);
            }
        });
        buttons[1].addEventListener('click', () => {
            d.hide();
            if (typeof cancel === 'function') {
                cancel();
            }
        });
    }

    _preventDefault(evt) {
        console.log("Drag start");
        evt.preventDefault();
        return false;
    }

    createToolbarButton(txt, hover, fn) {
        const btn = document.createElement("a");
        btn.text = txt;
        btn.className = "frIcon frIconMenu";
        btn.title = hover;
        btn.draggable = false;
        btn.addEventListener("dragstart", this._preventDefault);
        btn.addEventListener("drop", this._preventDefault);
        btn.addEventListener("click", fn);
        return btn;
    }

    createSpacer() {
        const spacer = document.createElement('span');
        spacer.className = "frIconSpacer";
        return spacer;
    }

    // TODO: Strip out "report" should now point to this._parent
    sectionBrowse(report, reportData, ok, cancel) {
        const body = document.createElement('div');
        const span = document.createElement('span');
        span.innerText = "Sections:";
        body.appendChild(span);
        body.appendChild(document.createElement('br'));
        const elements = {Report: {}};

        const LI = (value, parent) => {
            let li = document.createElement("li");
            let span = document.createElement("div");
            span.innerHTML = value;
            li.appendChild(span);
            parent.appendChild(li);
            return li;
        };

        const A = (value, parent, elementKey, tracking) => {
             let a = document.createElement("a");
             a.addEventListener("click", () => {
                 if (value === "(delete)") {
                     tracking[elementKey].style.display = "none";
                     tracking["add" + elementKey].style.display = "";
                     tracking.Report[elementKey] = false;
                 } else {
                     tracking[elementKey].style.display = "";
                     tracking["add" + elementKey].style.display = "none";
                     tracking.Report[elementKey] = true;
                 }
             });
             a.style.marginLeft = "10px";
             a.style.cursor = "pointer";
             a.innerHTML = value;
             if (parent instanceof HTMLLIElement) {
                 parent.children[0].appendChild(a);
             } else {
                 parent.appendChild(a);
             }
             return a;
        };

        const createSection = (title, elementKey, parent, tracking, reportData) => {
            tracking[elementKey] = LI(title, parent);
            A("(delete)", tracking[elementKey], elementKey, tracking);
            if (reportData[elementKey]) {
                tracking.Report[elementKey] = true;
                tracking[elementKey].style.display = "";
                tracking["add"+elementKey].style.display = "none";
            } else {
                tracking.Report[elementKey] = false;
                tracking[elementKey].style.display = "none";
                tracking["add"+elementKey].style.display = "";
            }
        };

        const buildGroupings = (reportData, tracking, parent) => {
            tracking.groupBy = [];
            const finish = [];
            for (let i = 0; i < reportData.groupBy.length; i++) {
                let gbk = {name: reportData.groupBy[i].groupOn, Report: {}};
                let pd = LI("Group on <b>" + gbk.name+"</b>", parent);
                tracking.groupBy.push(gbk);
                gbk.addheader = A("(Add Header)", pd, "header", gbk);
                gbk.adddetail = A("(Add Detail)", pd, "detail", gbk);
                gbk.addfooter = A("(Add Footer)", pd, "footer", gbk);
                let ndg = document.createElement("ul");
                pd.appendChild(ndg);
                createSection("Header", "header", ndg, gbk, reportData.groupBy[i]);
                createSection("Detail: <b>"+gbk.name+"</b>", "detail", ndg, gbk, reportData.groupBy[i]);
                finish.push({title: "Footer", key: "footer", parent: ndg, data: gbk, report: reportData.groupBy[i]});
//                createSection("Footer", "footer", ndg, gbk, reportData.groupBy[i]);
            }
            return finish;
        };


        const finishFooters = (finish) => {
            if (!finish || finish.length === 0) { return; }
            for (let i=0;i<finish.length;i++) {
                createSection(finish[i].title, finish[i].key, finish[i].parent, finish[i].data, finish[i].report);
            }
        };

        const buildSubReport = (reportData, tracking, parent) => {
            let rbk = {name: reportData.data, Report: {}};
            tracking.subReport = rbk;
            let pd = LI("SubReport: <b>"+rbk.name+"</b>", parent);
            rbk.addheader = A("(Add Header)", pd, "header", rbk);
            rbk.adddetail = A("(Add Detail)", pd, "detail", rbk);
            rbk.addfooter = A("(Add Footer)", pd, "footer", rbk);
            let ndg = document.createElement("ul");
            pd.appendChild(ndg);
            createSection("Header", "header", ndg, rbk, reportData);

            let finish;
            if (reportData.groupBy) {
                finish = buildGroupings(reportData, rbk, ndg);
            }
            createSection( "Detail: <b>"+rbk.name+"</b>", "detail", ndg, rbk, reportData);
            finishFooters(finish);

            createSection( "Footer", "footer", ndg, rbk, reportData);
        };




        let group = document.createElement("ul");
        let pd = LI("Primary Report/Data", group);
        elements.addtitleHeader = A("(Add Title Header)", pd, "titleHeader", elements);
        elements.addpageHeader = A("(Add Page Header)", pd, "pageHeader", elements);
        elements.adddetail = A("(Add Detail)", pd, "detail", elements);
        elements.addpageFooter = A( "(Add Page Footer)", pd, "pageFooter", elements);
        elements.addfinalSummary = A("(Add Final Summary)", pd, "finalSummary", elements);

        let pdg = document.createElement("ul");
        pd.appendChild(pdg);

        createSection("Title Header", "titleHeader", pdg, elements, reportData);
        createSection( "Page Header", "pageHeader", pdg, elements, reportData);
        let finish;
        if (reportData.groupBy) {
            finish = buildGroupings(reportData, elements, pdg);
        }
        createSection( "Page Details", "detail", pdg, elements, reportData);

        if (reportData.subReport) {
            buildSubReport(reportData.subReport, elements, pdg);
        }
        finishFooters(finish);

        createSection("Page Footer", "pageFooter", pdg, elements, reportData);
        createSection( "Final Summary", "finalSummary", pdg, elements, reportData);

        body.appendChild(group);

        let buttons =this.createButtons(["Ok", "Cancel"]);
        let btnContainer = document.createElement('div');
        btnContainer.appendChild(buttons[0]);
        btnContainer.appendChild(buttons[1]);
        body.appendChild(btnContainer);

        let d = new Dialog("Sections", body, this.hostElement);

        const rebuildReportSection = (reportInfo, data) => {
              for (let key in reportInfo) {
                  if (!reportInfo.hasOwnProperty(key)) { continue; }
                  if (reportInfo[key] === true) {
                      if (typeof data[key] === 'undefined') {
                          data[key] = [];
                      }
                  } else {
                      if (typeof data[key] !== 'undefined') {
                          delete data[key];
                      }
                  }
              }
        };

        const rebuildReport = (tracking, reportData) => {
            rebuildReportSection(tracking.Report, reportData);
            if (tracking.groupBy) {
                for (let i = 0; i < tracking.groupBy.length; i++) {
                    let found = false;
                    for (let j = 0; j < reportData.groupBy.length; j++) {
                        if (reportData.groupBy[j].groupOn === tracking.groupBy[i].name) {
                            found = true;
                            rebuildReportSection(tracking.groupBy[i].Report, reportData.groupBy[j]);
                        }
                    }
                    if (!found) {
                        console.log("Didn't find group", tracking.groupBy[i].name);
                    }
                }
            }
            if (tracking.subReport) {
                rebuildReport(tracking.subReport, reportData.subReport);
            }
        };


        buttons[0].addEventListener('click', () => {
            d.hide();
            rebuildReport(elements, reportData);

            if (typeof ok === 'function') {
                ok(reportData);
            }
        });
        buttons[1].addEventListener('click', () => {
            d.hide();
            if (typeof cancel === 'function') {
                cancel();
            }
        });


    }

    bandBrowse(report, bands, ok, cancel) {
        const body = document.createElement('div');
        const span = document.createElement('span');
        let currentBand = null;
        span.innerText = "Band Columns:";
        body.appendChild(span);
        body.appendChild(document.createElement('br'));
        const selectDiv = document.createElement('div');

        const select = document.createElement('select');
        select.style.border = "solid black 1px";
        select.style.margin = "5px";
        select.style.left = "5px";
        select.style.right = "5px";
        select.style.height = "200px";
        select.style.width = "200px";
        select.size = 10;
        let resultVariables = [];

        for (let i = 0; i < bands.length; i++) {
            resultVariables.push(shallowClone(bands[i]));
        }

        // Generates the Dynamic Alignment Select
        const createAlignSelect = () => {
            const curAlign = resultVariables[select.selectedIndex].align;
            let selectGroup = document.createElement('select');

            let item = new Option("Left", "1");
            if (curAlign === "1" || curAlign === 1) { item.selected = true; }
            selectGroup.appendChild(item);

            item = new Option("Right", "3");
            if (curAlign === "3" || curAlign === 3) { item.selected = true; }
            selectGroup.appendChild(item);

            item = new Option("Center", "2");
            if (curAlign === "2" || curAlign === 2) { item.selected = true; }
            selectGroup.appendChild(item);

            return selectGroup;
        };


        const properties = [
            {type: 'string', field: "width", functionable: true},
            {type: 'select', field: "align", translate: (val) => { return parseInt(val, 10); }, default: "left", display: createAlignSelect},
            {type: 'string', field: "textColor", default: "", functionable: true}
        ];


        selectDiv.appendChild(select);
        selectDiv.style.display = 'inline-block';
        body.appendChild(selectDiv);

        const valueDiv = document.createElement('div');
        valueDiv.margin = "5px";
        valueDiv.style.display = "inline-block";
        valueDiv.style.border = "solid black 1px";
        valueDiv.style.height = "200px";
        valueDiv.style.width = "200px";
        valueDiv.style.overflowX = "hidden";
        valueDiv.style.overflowY = "scroll";
        valueDiv.style.position = "relative";

        const propDiv = document.createElement('div');
        propDiv.style.width = "200px";

        valueDiv.appendChild(propDiv);

        select.addEventListener("change", () => {
            if (select.selectedIndex < 0) { return; }
            currentBand = resultVariables[select.selectedIndex];
            currentBand.properties = properties;
           this.showProperties(currentBand, propDiv, true);
        });


        const rebuildOptions = () => {
            while(select.children.length) {
                select.removeChild(select.children[0]);
            }
            for (let i=0;i<resultVariables.length;i++) {
                let option;
                if (typeof resultVariables[i].text !== 'undefined') {
                    option = new Option("TEXT - " + resultVariables[i].text, i.toString());
                } else if (typeof resultVariables[i].field !== 'undefined') {
                    option = new Option("FIELD - " + resultVariables[i].field, i.toString());
                } else if (typeof resultVariables[i].total !== 'undefined') {
                    option = new Option("TOTAL - " + resultVariables[i].total, i.toString());
                } else if (typeof resultVariables[i].calculation !== 'undefined') {
                    option = new Option("CALC - " + resultVariables[i].calculation, i.toString());
                } else if (typeof resultVariables[i].variable !== 'undefined') {
                    option = new Option( "VAR - " + resultVariables[i].variable, i.toString());
                } else if (resultVariables[i].function) {
                    option = new Option("FUNC - " + (resultVariables[i].function.name || "function"), i.toString());
                } else {
                    console.log("Unknown BAND type in bandBrowse", resultVariables[i]);
                }
                if (option) {
                    select.appendChild(option);
                }
            }
           this.clearArea(propDiv);
        };
        rebuildOptions();



        let addButtons =this.createButtons(["Add", "Edit", "Delete", "\uE83B", "\uE83C"], {width: "100px", marginTop: "5px"});
        let addBtnContainer = document.createElement('div');
        addBtnContainer.style.padding = "5px";
        addBtnContainer.style.display = 'inline-block';
        addBtnContainer.style.verticalAlign = "top";

        // Add Up/Down
        addButtons[3].style.width = "47px";
        addButtons[4].style.width = "47px";
        addBtnContainer.appendChild(addButtons[3]);
        addBtnContainer.appendChild(addButtons[4]);
        addBtnContainer.appendChild(document.createElement('br'));
        addBtnContainer.appendChild(document.createElement('br'));

        addBtnContainer.appendChild(addButtons[0]);
        addBtnContainer.appendChild(document.createElement('br'));
        addBtnContainer.appendChild(addButtons[1]);
        addBtnContainer.appendChild(document.createElement('br'));
        addBtnContainer.appendChild(addButtons[2]);

        body.appendChild(addBtnContainer);
        body.appendChild(valueDiv);

        // Move Up
        addButtons[3].addEventListener("click", () => {
            if (select.selectedIndex <= 0) { return; }
            let idx = select.selectedIndex;
            let currentBand = resultVariables.splice(idx, 1);
            if (idx-1 === 0) {
                resultVariables.unshift(currentBand[0]);
            } else {
                let temp = resultVariables.splice(0, idx-1);
                temp.push(currentBand[0]);
                resultVariables = temp.concat(resultVariables);
            }
            rebuildOptions();
        });

        // Move Down
        addButtons[4].addEventListener("click", () => {
            if (select.selectedIndex < 0) {
                return;
            }
            if (select.selectedIndex >= bands.length - 1) {
                return;
            }
            let idx = select.selectedIndex;
            let currentBand = resultVariables.splice(idx, 1);
            let temp = resultVariables.splice(0, idx + 1);
            temp.push(currentBand[0]);
            resultVariables = temp.concat(resultVariables);
            rebuildOptions();
        });


        // Add
        addButtons[0].addEventListener("click", () => {
           this.bandValueEditor(report, {text: "", type:"text", width: 100}, (value) => {
                    resultVariables.push(value);
                    rebuildOptions();
            });
        });

        // Edit
        addButtons[1].addEventListener("click", () => {
            if (select.selectedIndex < 0) { return; }
           this.bandValueEditor(report, resultVariables[select.selectedIndex], (value) => {
                resultVariables[select.selectedIndex] = value;
                rebuildOptions();
            });
        });

        // Delete
        addButtons[2].addEventListener("click", () => {
            if (select.selectedIndex >= 0) {
                resultVariables.splice(select.selectedIndex, 1);
                rebuildOptions();
            }
        });


        let buttons =this.createButtons(["Ok", "Cancel"]);
        let btnContainer = document.createElement('div');
        btnContainer.appendChild(buttons[0]);
        btnContainer.appendChild(buttons[1]);
        body.appendChild(btnContainer);

        let d = new Dialog("Bands", body, this.hostElement);

        buttons[0].addEventListener('click', () => {
            d.hide();
            if (typeof ok === 'function') {
                // Eliminate the temporary properties object
                for (let i=0;i<resultVariables.length;i++) {
                    delete resultVariables[i].properties;
                }
                ok(resultVariables);
            }
        });
        buttons[1].addEventListener('click', () => {
            d.hide();
            if (typeof cancel === 'function') {
                cancel();
            }
        });
    }

    bandValueEditor(report, fields, ok, cancel) {

        // Figure out Band type...
        let field = null, isTotal = false;
        if (typeof fields.text !== "undefined") {
            field = "text";
        } else if (fields.function) {
            field = "function";
        } else if (fields.field) {
            field = fields.field;
        } else if (fields.variable) {
            field = fields.variable;
        } else if (fields.calculation) {
            field = fields.calculation;
        } else if (fields.total) {
            field = fields.total;
            isTotal = true;
        }
        let select =this.createDataSelect(report, field, 63, isTotal);
        let newField =  shallowClone(fields);
        if (newField.function) {
            newField.function = shallowClone(fields.function);
        }

        const body = document.createElement('div');
        const title = document.createElement("span");
        title.style.marginLeft = "5px";
        title.innerText = "Band cell value:";
        body.appendChild(title);
        body.appendChild(select);
        body.appendChild(document.createElement('br'));

        const textSpan = document.createElement('span');
        textSpan.innerText = "Text value:";
        textSpan.style.marginLeft = "5px";
        textSpan.style.display = "none";
        body.appendChild(textSpan);

        const textInput = document.createElement('input');
        textInput.type = "input";
        textInput.style.display = "none";
        textInput.addEventListener("change", () => {
            newField.text = textInput.value;
        });
        body.appendChild(textInput);

        const functionButton =this.createButtons(["Edit Function"])[0];
        functionButton.style.display = "none";
        functionButton.style.marginLeft = "5px";
        functionButton.addEventListener("click", () => {
           this.functionEditor(newField.function.function || '', newField.function.name, newField.function.async, newField.function.skip,
                (value, name, isAsync, skipped) => {
                    let obj = {};
                    if (isAsync != null) {
                        newField.function.async = isAsync;
                    }
                    if (skipped != null) {
                        newField.function.skip = skipped;
                    }
                    obj.type = 'function';
                    newField.function.name = name;
                    newField.function.function = value;
                });
        });
        body.appendChild(functionButton);
        body.appendChild(document.createElement('br'));


        const setupSubFields = () => {
            if (select.selectedIndex < 0) { return; }
            let option = select.selectedOptions[0];
            if (select.selectedIndex === 0) {
                textSpan.style.display = "";
                textInput.style.display = "";
                functionButton.style.display = "none";
                if (typeof newField.text === 'undefined') {
                    newField.text = "";
                }
                textInput.value = newField.text;
            } else if (select.selectedIndex === 1) {
                textSpan.style.display = "none";
                textInput.style.display = "none";
                functionButton.style.display = "";
                if (typeof newField.function === 'undefined') {
                    newField.function = {type: "function", async: false, function: "", name: "Band Function" };
                }
            } else {
                textSpan.style.display = "none";
                textInput.style.display = "none";
                functionButton.style.display = "none";
                if (typeof option.dataSet !== 'undefined') {
                    // TODO - Future; check to see where the band is located; we could auto-set 'field' to 'parentData'
                    newField.field = select.value;
                 } else {
                    // Variables
                    if (option.tag === 4) {
                        newField.variable = select.value;
                    }
                    // Calculations
                    else if (option.tag === 8) {
                        newField.calculation = select.value;
                    }
                    // Totals
                    else if (option.tag === 16) {
                        newField.total = select.value;
                    }
                 }

            }
        };
        setupSubFields();

        select.addEventListener("change", setupSubFields);

        const buttons =this.createButtons(["Ok", "Cancel"]);
        let btnContainer = document.createElement('div');
        btnContainer.appendChild(buttons[0]);
        btnContainer.appendChild(buttons[1]);
        body.appendChild(btnContainer);

        let d = new Dialog("Band Editor", body, this.hostElement);

        // Ok Button
        buttons[0].addEventListener('click', () => {
            d.hide();
            const option = select.selectedOptions[0];
            switch (option.tag) {
                case 1:
                case 2: // Data
                    delete newField.function;
                    delete newField.calculation;
                    delete newField.variable;
                    delete newField.text;
                    delete newField.total;
                    break;

                case 4: // Variables
                    delete newField.function;
                    delete newField.calculation;
                    delete newField.text;
                    delete newField.total;
                    delete newField.field;
                    break;

                case 8: // Calc
                    delete newField.function;
                    delete newField.text;
                    delete newField.total;
                    delete newField.field;
                    delete newField.variable;
                    break;

                case 16:
                    delete newField.function;
                    delete newField.text;
                    delete newField.field;
                    delete newField.variable;
                    delete newField.calculation;
                    break;

                case 32:
                    delete newField.field;
                    delete newField.variable;
                    delete newField.calculation;
                    if (select.selectedIndex === 0) {
                        delete newField.function;
                    } else {
                        delete newField.text;
                    }
                    break;
            }

            if (typeof ok === 'function') {
                ok(newField);
            }
        });
        // Cancel Button
        buttons[1].addEventListener('click', () => {
            d.hide();
            if (typeof cancel === 'function') {
                cancel();
            }
        });

    }

    totalsBrowse(totals, report, ok, cancel) {
        const body = document.createElement('div');
        const span = document.createElement('span');
        span.innerText = "Totals:";
        body.appendChild(span);
        body.appendChild(document.createElement('br'));
        const selectDiv = document.createElement('div');

        const select = document.createElement('select');
        select.style.border = "solid black 1px";
        select.style.margin = "5px";
        select.style.left = "5px";
        select.style.right = "5px";
        select.style.height = "200px";
        select.style.width = "200px";
        select.size = 10;
        const resultVariables = {average: [], count:[], min:[], max:[], sum: []};
        const groups = {sum: null, average: null, count: null, min: null, max: null};

        for (let key in resultVariables) { // jshint ignore:line
            if (!resultVariables.hasOwnProperty(key)) {
                console.log("Error: Total type was not found in results", key);
                continue;
            }
            const group = document.createElement("optgroup");
            group.label = key;
            groups[key] = group;
            select.appendChild(group);
            if (!totals.hasOwnProperty(key)) { continue; }

            for (let i=0;i<totals[key].length;i++) {
                const option = new Option(totals[key][i]);
                group.appendChild(option);
                // Copy variables
                resultVariables[key].push(totals[key][i]);
            }

        }

        selectDiv.appendChild(select);
        selectDiv.style.display = 'inline-block';
        body.appendChild(selectDiv);

        let addButtons =this.createButtons(["Add", "Edit", "Delete"], {width: "100px", marginTop: "5px"});
        let addBtnContainer = document.createElement('div');
        //addBtnContainer.style.display = ''
        addBtnContainer.style.padding = "5px";
        addBtnContainer.style.display = 'inline-block';
        addBtnContainer.style.verticalAlign = "top";
        addBtnContainer.appendChild(addButtons[0]);
        addBtnContainer.appendChild(document.createElement('br'));
        addBtnContainer.appendChild(addButtons[1]);
        addBtnContainer.appendChild(document.createElement('br'));
        addBtnContainer.appendChild(addButtons[2]);
        body.appendChild(addBtnContainer);


        // Add
        addButtons[0].addEventListener("click", () => {
           this.totalFieldEditor(report, "", "sum", (name, type) => {
                if (name != null && name !== '') {

                    // Check to see if total in type already exists
                    if (resultVariables[type].indexOf(name) >= 0) { return; }

                    // Add new Total
                    groups[type].appendChild(new Option(name));
                    resultVariables[type].push(name);
                }
            });
        });

        // Edit
        addButtons[1].addEventListener("click", () => {
            if (select.selectedIndex < 0) { return; }

            let value = select.value, type = "sum", counter=-1;
            for (let key in resultVariables) {
                if (!resultVariables.hasOwnProperty(key)) { continue; }
                counter += resultVariables[key].length;
                if (select.selectedIndex <= counter) {
                    type = key; break;
                }
            }
           this.totalFieldEditor(report, value, type, (name, newType) => {
               if (name == null || name === '') { return; }

               // Find old index location
               const idx = resultVariables[type].indexOf(value);
               if (name !== value) {
                    resultVariables[type][idx] = name;
                    select.options[select.selectedIndex].text = name;
                }
                if (type !== newType) {
                    let option = select.options[select.selectedIndex];
                    groups[type].removeChild(option);
                    resultVariables[type].splice(idx, 1);

                    // Don't re-add existing totals, basically act like we merged them.
                    if (resultVariables[newType].indexOf(name) < 0) {
                        groups[newType].appendChild(option);
                        resultVariables[newType].push(name);
                    }
                } else {
                    resultVariables[type][idx] = name;
                }
            });
        });

        // Delete
        addButtons[2].addEventListener("click", () => {
            let type = "sum", counter = -1;
            if (select.selectedIndex < 0) {
                return;
            }

            for (let key in resultVariables) {
                if (!resultVariables.hasOwnProperty(key)) {
                    continue;
                }
                counter += resultVariables[key].length;
                if (select.selectedIndex <= counter) {
                    type = key;
                    break;
                }
            }

            const idx = resultVariables[type].indexOf(select.value);
            resultVariables[type].splice(idx, 1);
            select.options[select.selectedIndex] = null;
        });



        let buttons =this.createButtons(["Ok", "Cancel"]);
        let btnContainer = document.createElement('div');
        btnContainer.appendChild(buttons[0]);
        btnContainer.appendChild(buttons[1]);
        body.appendChild(btnContainer);

        let d = new Dialog("Totals", body, this.hostElement);

        buttons[0].addEventListener('click', () => {
            d.hide();
            if (typeof ok === 'function') {
                ok(resultVariables);
            }
        });
        buttons[1].addEventListener('click', () => {
            d.hide();
            if (typeof cancel === 'function') {
                cancel();
            }
        });
    }

    totalFieldEditor(report, selected, type, ok, cancel) {

        let types = ["sum", "average", "count", "min", "max"];

        const body = document.createElement('div');
        body.style.marginBottom = "5px";

        let title = document.createElement("span");
        title.style.marginLeft = "5px";
        title.innerText = "Total type ";
        body.appendChild(title);
        const selectType = document.createElement("select");
        for (let i=0;i<types.length;i++) {
            let option = new Option(types[i]);
            if (types[i] === type) {
                option.selected = true;
            }
            selectType.appendChild(option);
        }

        body.appendChild(selectType);


        title = document.createElement("span");
        title.innerText = " on field ";
        body.appendChild(title);
        const select =this.createDataSelect(report, selected, 3);
        body.appendChild(select);



        let buttons =this.createButtons(["Ok", "Cancel"]);
        let btnContainer = document.createElement('div');
        btnContainer.appendChild(buttons[0]);
        btnContainer.appendChild(buttons[1]);
        body.appendChild(btnContainer);

        let d = new Dialog("Total Field", body, this.hostElement);

        // Ok Button
        buttons[0].addEventListener('click', () => {
            d.hide();
            if (typeof ok === 'function') {
                ok(select.value, selectType.value);
            }
        });
        // Cancel Button
        buttons[1].addEventListener('click', () => {
            d.hide();
            if (typeof cancel === 'function') {
                cancel();
            }
        });

    }

    dataFieldEditor(fields, ok, cancel) {
        const body = document.createElement('div');
        const title = document.createElement("span");
        title.style.marginLeft = "5px";
        title.innerText = "Choose your Data field:";
        body.appendChild(title);
        const select = fields;
        body.appendChild(select);
        let buttons =this.createButtons(["Ok", "Cancel"]);
        let btnContainer = document.createElement('div');
        btnContainer.appendChild(buttons[0]);
        btnContainer.appendChild(buttons[1]);
        body.appendChild(btnContainer);

        let d = new Dialog("Choose DataField", body, this.hostElement);

        // Ok Button
        buttons[0].addEventListener('click', () => {
            d.hide();
            const option = select.selectedOptions[0];
            if (typeof ok === 'function') {
                ok(select.value, option.tag, option.dataSet);
            }
        });
        // Cancel Button
        buttons[1].addEventListener('click', () => {
            d.hide();
            if (typeof cancel === 'function') {
                cancel();
            }
        });

    }

    _processFile(file, regEx, callback) {
        if ( regEx == null || regEx.test(file.name) ) {
            const reader = new FileReader();
            reader.addEventListener("load", function () {
                callback(reader.result);
            }, false);
            reader.readAsDataURL(file);
        } else {
            callback(null);
        }
    }

    fileEditor(value, acceptable=[], autoClose=false, ok=null, cancel=null) {
        const body = document.createElement('div');
        const title = document.createElement("span");
        title.style.marginLeft = "5px";
        title.innerText = "Choose a file:";
        body.appendChild(title);
        const file = document.createElement('input');
        file.type = "file";

        const br = document.createElement('br');

        const error = document.createElement('div');
        error.className = "frError";

        body.appendChild(file);
        body.appendChild(br);
        body.appendChild(error);

        let accept = "";
        for (let i=0;i<acceptable.length;i++) {
            if (i>0) { accept += ","; }
            accept+= acceptable[i];
        }
        if (accept.length) {
            file.accept = accept;
        }

        let buttons =this.createButtons(["Ok", "Cancel"]);
        buttons[0].disabled = true;
        let newValue = value;
        let fileName = '';


        let btnContainer = document.createElement('div');
        btnContainer.appendChild(buttons[0]);
        btnContainer.appendChild(buttons[1]);
        body.appendChild(btnContainer);

        let d = new Dialog("Choose", body, this.hostElement);

        // choose file button
        file.addEventListener("change", () => {
            let found = true;
            let acceptableRegEx = null;
            if (file.files.length) {
                if (acceptable.length) {
                    found = false;
                    for (let i=0;i<acceptable.length;i++) {
                        if (file.files[0].name.indexOf(acceptable[i]) > 0 ) {
                            found = true;
                            break;
                        }
                    }
                    acceptableRegEx = new RegExp('(\\'+acceptable.join("|\\")+')$', "i");
                }
                if (!found) {
                    error.innerText = "Please choose a valid file!";
                    return;
                } else {
                    error.innerText = "";
                }

                file.disabled = true;
                buttons[1].disabled = true;
                fileName = file.files[0].name;
                this._processFile(file.files[0],  acceptableRegEx, (val) => {
                    buttons[1].disabled = false;
                    if (val !== null) {
                        buttons[0].disabled = false;
                        newValue = val;
                    }
                    if (autoClose) {
                        d.hide();
                        if (typeof ok === 'function') {
                            ok(newValue, fileName);
                        }
                    }
                });
            } else {
                newValue = null;
            }
        });


        // Ok Button
        buttons[0].addEventListener('click', () => {
            d.hide();
            if (typeof ok === 'function') {
                ok(newValue, fileName);
            }
        });
        // Cancel Button
        buttons[1].addEventListener('click', () => {
            d.hide();
            if (typeof cancel === 'function') {
                cancel();
            }
        });

    }

    functionBrowse(functions, ok, cancel) {
        const body = document.createElement('div');
        const span = document.createElement('span');
        span.innerText = "Functions:";
        body.appendChild(span);
        body.appendChild(document.createElement('br'));
        const selectDiv = document.createElement('div');


        const select = document.createElement('select');
        select.style.border = "solid black 1px";
        select.style.margin = "5px";
        select.style.left = "5px";
        select.style.right = "5px";
        select.style.height = "200px";
        select.style.width = "200px";
        select.size = 10;
        const resultFunctions = [];

        for (let i=0;i<functions.length;i++) {
            let temp = shallowClone(functions[i]);
            resultFunctions.push(temp);
            const option = new Option(functions[i].name, i.toString());
            select.appendChild(option);
        }

        selectDiv.appendChild(select);
        selectDiv.style.display = 'inline-block';
        body.appendChild(selectDiv);

        let addButtons = this.createButtons(["Add", "Edit", "Delete"], {width: "100px", marginTop: "5px"});
        let addBtnContainer = document.createElement('div');
        //addBtnContainer.style.display = ''
        addBtnContainer.style.padding = "5px";
        addBtnContainer.style.display = 'inline-block';
        addBtnContainer.style.verticalAlign = "top";
        addBtnContainer.appendChild(addButtons[0]);
        addBtnContainer.appendChild(document.createElement('br'));
        addBtnContainer.appendChild(addButtons[1]);
        addBtnContainer.appendChild(document.createElement('br'));
        addBtnContainer.appendChild(addButtons[2]);
        body.appendChild(addBtnContainer);

        // Add
        addButtons[0].addEventListener("click", () => {
           this.functionEditor("", "", false, false, (value, name, isAsync, skipped) => {
                let obj = {};
                if (isAsync != null) {
                    obj.async = isAsync;
                }
                if (skipped != null) {
                    obj.skip = skipped;
                }
                obj.type = 'function';
                obj.name = name;
                obj.function = value;
                select.appendChild(new Option(name, resultFunctions.length.toString()));
                resultFunctions.push(obj);
            });
        });


        // Edit
        addButtons[1].addEventListener("click", () => {
            let obj = resultFunctions[select.value];
           this.functionEditor(obj.function, obj.name, obj.async || false, obj.skip || false, (value, name, isAsync, skipped) => {
                if (isAsync != null) {
                    obj.async = isAsync;
                }
                if (skipped != null) {
                    obj.skip = skipped;
                }
                if (name !== obj.name) {
                    select.options[select.selectedIndex].text = name;
                }
                obj.name = name;
                obj.function = value;
            });
        });

        // Delete
        addButtons[2].addEventListener("click", () => {
            if (select.selectedIndex >= 0) {
                let key = select.value;
                resultFunctions[key] = null;
                select.options[select.selectedIndex] = null;
            }
        });



        let buttons =this.createButtons(["Ok", "Cancel"]);
        let btnContainer = document.createElement('div');
        btnContainer.appendChild(buttons[0]);
        btnContainer.appendChild(buttons[1]);
        body.appendChild(btnContainer);

        let d = new Dialog("Functions", body, this.hostElement);

        buttons[0].addEventListener('click', () => {
            d.hide();
            for (let i=0;i<resultFunctions.length;i++) {
                if (resultFunctions[i] === null) {
                    resultFunctions.splice(i, 1);
                    i--;
                }
            }

            if (typeof ok === 'function') {
                ok(resultFunctions);
            }
        });
        buttons[1].addEventListener('click', () => {
            d.hide();
            if (typeof cancel === 'function') {
                cancel();
            }
        });
    }

    functionEditor(source, name, async, disabled, ok, cancel) {
        const body = document.createElement('div');
        const functionText = document.createElement('span');
        if (async) {
            functionText.innerText = "function (report, data, state, vars, done) {";
        } else {
            functionText.innerText = "function (report, data, state, vars) {";
        }
        body.appendChild(functionText);
        body.appendChild(document.createElement("br"));
        const textArea = document.createElement('textarea');
        textArea.style.border = "solid black 1px";
        textArea.style.margin = "5px";
        textArea.style.marginLeft = "15px";
        textArea.style.height = "200px";
        textArea.style.width = "475px";
        textArea.style.maxWidth = "475px";
        textArea.value = source;
        let asyncCheckbox, skipCheckbox, nameValue;
        if (name != null) {
            const label = document.createElement('div');
            const span = document.createElement('span');
            span.innerText = "Name: ";
            label.appendChild(span);
            nameValue = document.createElement('input');
            nameValue.value = name;
            label.appendChild(nameValue);
            body.appendChild(label);
        }
        // Add Text Area
        body.appendChild(textArea);
        body.appendChild(document.createElement("br"));
        const closeBracket = document.createElement('span');
        closeBracket.innerText = "}";
        body.appendChild(closeBracket);

        if (async != null) {
            const label = document.createElement('div');
            const span = document.createElement('span');
            span.innerText = "Async Function:";
            label.appendChild(span);
            asyncCheckbox = document.createElement('input');
            asyncCheckbox.type = 'checkbox';
            if (async) { asyncCheckbox.checked = true; }
            asyncCheckbox.addEventListener('change', () => {
                if (asyncCheckbox.checked) {
                    functionText.innerText = "function (report, data, state, vars, done) {";
                } else {
                    functionText.innerText = "function (report, data, state, vars) {";
                }
            });

            label.appendChild(asyncCheckbox);
            body.appendChild(label);
        }
        if (disabled != null) {
            const label = document.createElement('div');
            const span = document.createElement('span');
            span.innerText = "Disable Function:";
            label.appendChild(span);
            skipCheckbox = document.createElement('input');
            skipCheckbox.type = 'checkbox';
            if (disabled) {
                skipCheckbox.checked = true;
            }
            label.appendChild(skipCheckbox);
            body.appendChild(label);
        }
        let buttons =this.createButtons(["Ok", "Cancel"]);
        let btnContainer = document.createElement('div');
        btnContainer.appendChild(buttons[0]);
        btnContainer.appendChild(buttons[1]);
        body.appendChild(btnContainer);

        let d = new Dialog("Function Editor", body, this.hostElement);

        buttons[0].addEventListener('click', () => {
            d.hide();
            let text = textArea.value;
            if (typeof ok === 'function') {
                if (async !== null && asyncCheckbox.checked) {
                      if (text.indexOf('done()') < 0) {
                          text += "; done();";
                      }
                }
                ok(text, nameValue ? nameValue.value : null, async == null ? null : asyncCheckbox.checked, disabled == null ? null : skipCheckbox.checked );
            }
        });
        buttons[1].addEventListener('click', () => {
            d.hide();
            if (typeof cancel === 'function') {
                cancel();
            }
        });
    }

    fontsBrowse(fonts, ok, cancel) {
        const body = document.createElement('div');
        const span = document.createElement('span');
        span.innerText = "Fonts:";
        body.appendChild(span);
        body.appendChild(document.createElement('br'));
        const selectDiv = document.createElement('div');

        const select = document.createElement('select');
        select.style.border = "solid black 1px";
        select.style.margin = "5px";
        select.style.left = "5px";
        select.style.right = "5px";
        select.style.height = "200px";
        select.style.width = "200px";
        select.size = 10;
        const resultFonts = [];

        for (let i=0;i<fonts.length;i++) {
            let temp = shallowClone(fonts[i]);
            resultFonts.push(temp);
            const option = new Option(fonts[i].name, i.toString());
            select.appendChild(option);
        }

        selectDiv.appendChild(select);
        selectDiv.style.display = 'inline-block';
        body.appendChild(selectDiv);

        let addButtons =this.createButtons(["Add", "Edit", "Delete"], {width: "100px", marginTop: "5px"});
        let addBtnContainer = document.createElement('div');
        addBtnContainer.style.padding = "5px";
        addBtnContainer.style.display = 'inline-block';
        addBtnContainer.style.verticalAlign = "top";
        addBtnContainer.appendChild(addButtons[0]);
        addBtnContainer.appendChild(document.createElement('br'));
        addBtnContainer.appendChild(addButtons[1]);
        addBtnContainer.appendChild(document.createElement('br'));
        addBtnContainer.appendChild(addButtons[2]);
        body.appendChild(addBtnContainer);

        // Add
        addButtons[0].addEventListener("click", () => {
            this.fontsEditor("New Font", '', (name, data) => {
                let obj = {};
                obj.name = name;
                obj.data = data;
                select.appendChild(new Option(name, resultFonts.length.toString()));
                resultFonts.push(obj);
            });
        });

        // Edit
        addButtons[1].addEventListener("click", () => {
            let obj = resultFonts[select.value];
            this.fontsEditor(obj.name, obj.data, (name /*, data */) => {
                if (name !== obj.name) {
                    select.options[select.selectedIndex].text = name;
                }
                obj.name = name;
            });
        });

        // Delete
        addButtons[2].addEventListener("click", () => {
            if (select.selectedIndex >= 0) {
                let key = select.value;
                resultFonts[key] = null;
                select.options[select.selectedIndex] = null;
            }
        });

        let buttons =this.createButtons(["Ok", "Cancel"]);
        let btnContainer = document.createElement('div');
        btnContainer.appendChild(buttons[0]);
        btnContainer.appendChild(buttons[1]);
        body.appendChild(btnContainer);

        let d = new Dialog("Fonts", body, this.hostElement);

        buttons[0].addEventListener('click', () => {
            d.hide();
            for (let i=0;i<resultFonts.length;i++) {
                if (resultFonts[i] === null) {
                    resultFonts.splice(i, 1);
                    i--;
                }
            }

            if (typeof ok === 'function') {
                ok(resultFonts);
            }
        });
        buttons[1].addEventListener('click', () => {
            d.hide();
            if (typeof cancel === 'function') {
                cancel();
            }
        });
    }

    fontsEditor(name, data, ok, cancel) {
        let newData = data;
        const body = document.createElement('div');

        const nameDiv = document.createElement('div');
        const name1 = document.createElement('span');
        name1.innerText = "Name:";

        const variableName = document.createElement('input');
        variableName.value = name;
        nameDiv.appendChild(name1);
        nameDiv.appendChild(variableName);

        const valueDiv = document.createElement('div');

        let uploadButton = this.createButtons(["Choose font"]);
        uploadButton[0].addEventListener('click', () => {
            this.fileEditor(data, [".ttf", ".otf"], true, (data, fileName) => {
                const idx = data.indexOf("base64,");  // strip data:font/ttf;base64,
                if (idx > 0) {
                    newData = data.substring(idx+7);
                } else {
                    newData = data;
                }
                if (fileName && fileName.length) {
                    variableName.value = fileName.replace(".ttf", "").replace(".otf","");
                }
            });
        });

        valueDiv.appendChild(uploadButton[0]);

        body.appendChild(valueDiv);
        body.appendChild(nameDiv);

        let buttons =this.createButtons(["Ok", "Cancel"]);
        let btnContainer = document.createElement('div');
        btnContainer.appendChild(buttons[0]);
        btnContainer.appendChild(buttons[1]);
        body.appendChild(btnContainer);

        let d = new Dialog("Value Editor", body, this.hostElement);

        buttons[0].addEventListener('click', () => {
            d.hide();
            if (typeof ok === 'function') {
                ok(variableName.value, newData);
            }
        });
        buttons[1].addEventListener('click', () => {
            d.hide();
            if (typeof cancel === 'function') {
                cancel();
            }
        });
    }


    calculationBrowse(calculations, ok, cancel) {
        const body = document.createElement('div');
        const span = document.createElement('span');
        span.innerText = "Calculations:";
        body.appendChild(span);
        body.appendChild(document.createElement('br'));
        const selectDiv = document.createElement('div');

        const select = document.createElement('select');
        select.style.border = "solid black 1px";
        select.style.margin = "5px";
        select.style.left = "5px";
        select.style.right = "5px";
        select.style.height = "200px";
        select.style.width = "200px";
        select.size = 10;
        const resultFunctions = [];

        for (let i=0;i<calculations.length;i++) {
            let temp = shallowClone(calculations[i]);
            resultFunctions.push(temp);
            const option = new Option(calculations[i].name, i.toString());
            select.appendChild(option);
        }

        selectDiv.appendChild(select);
        selectDiv.style.display = 'inline-block';
        body.appendChild(selectDiv);

        let addButtons =this.createButtons(["Add", "Edit", "Delete"], {width: "100px", marginTop: "5px"});
        let addBtnContainer = document.createElement('div');
        //addBtnContainer.style.display = ''
        addBtnContainer.style.padding = "5px";
        addBtnContainer.style.display = 'inline-block';
        addBtnContainer.style.verticalAlign = "top";
        addBtnContainer.appendChild(addButtons[0]);
        addBtnContainer.appendChild(document.createElement('br'));
        addBtnContainer.appendChild(addButtons[1]);
        addBtnContainer.appendChild(document.createElement('br'));
        addBtnContainer.appendChild(addButtons[2]);
        body.appendChild(addBtnContainer);

        // Add
        addButtons[0].addEventListener("click", () => {
           this.calculationEditor("", "concat", [],  (name, op, fields) => {
                let obj = {};
                obj.type = 'calculation';
                obj.name = name;
                obj.fields = fields;
                obj.op = op;
                select.appendChild(new Option(name, resultFunctions.length.toString()));
                resultFunctions.push(obj);
            });
        });


        // Edit
        addButtons[1].addEventListener("click", () => {
            let obj = resultFunctions[select.value];
           this.calculationEditor(obj.name, obj.op, obj.fields, (name, op, fields) => {
                if (name !== obj.name) {
                    select.options[select.selectedIndex].text = name;
                }
                obj.name = name;
                obj.op = op;
                obj.fields = fields;
            });
        });

        // Delete
        addButtons[2].addEventListener("click", () => {
            if (select.selectedIndex >= 0) {
                let key = select.value;
                resultFunctions[key] = null;
                select.options[select.selectedIndex] = null;
            }
        });

        let buttons =this.createButtons(["Ok", "Cancel"]);
        let btnContainer = document.createElement('div');
        btnContainer.appendChild(buttons[0]);
        btnContainer.appendChild(buttons[1]);
        body.appendChild(btnContainer);

        let d = new Dialog("Calculations", body, this.hostElement);

        buttons[0].addEventListener('click', () => {
            d.hide();
            for (let i=0;i<resultFunctions.length;i++) {
                if (resultFunctions[i] === null) {
                    resultFunctions.splice(i, 1);
                    i--;
                }
            }

            if (typeof ok === 'function') {
                ok(resultFunctions);
            }
        });
        buttons[1].addEventListener('click', () => {
            d.hide();
            if (typeof cancel === 'function') {
                cancel();
            }
        });
    }

    calculationEditor(name, op, fields, ok, cancel) {
        const body = document.createElement('div');
        let nameValue;

        // Handle Name
        let label = document.createElement('div');
        let span = document.createElement('span');
        span.innerText = "Name: ";
        label.appendChild(span);
        nameValue = document.createElement('input');
        nameValue.value = name;
        label.appendChild(nameValue);
        body.appendChild(label);

        // Handle the Operation
        label = document.createElement('div');
        span = document.createElement('span');
        span.innerText = "Operation: ";
        label.appendChild(span);

        const opValue = document.createElement('select');
        let options = ['concat', 'add', 'minus', 'multiply', 'divide'];
        for (let i = 0; i < options.length; i++) {
            // noinspection RedundantConditionalExpressionJS
            let isSelected = options[i] === op ? true : false;
            let opt = new Option(options[i], options[i], isSelected, isSelected);
            opValue.appendChild(opt);
        }
        label.appendChild(opValue);
        body.appendChild(label);

        const getOptionsTitle = function(resultFields) {
            if (resultFields.field) { return "Field: " + resultFields.field; }
            else if (resultFields.text) { return "Text: " + resultFields.text; }
            else if (resultFields.total) { return "Total: " + resultFields.total; }
            else if (resultFields.function) { return "Function: "+ resultFields.function.name; }
            return "Unknown";
        };


        label = document.createElement('div');
        label.style.display = "inline-flex";
        span = document.createElement('span');
        span.style.verticalAlign = "top";
        span.innerText = "Fields:";
        label.appendChild(span);
        const fieldSelect = document.createElement('select');
        fieldSelect.style.border = "solid black 1px";
        fieldSelect.style.margin = "5px";
        fieldSelect.style.left = "5px";
        fieldSelect.style.right = "5px";
        fieldSelect.style.height = "200px";
        fieldSelect.style.width = "200px";
        fieldSelect.size = 10;
        label.appendChild(fieldSelect);
        body.appendChild(label);

        const resultFields = [];
        for (let i=0;i<fields.length;i++) {
            let temp = shallowClone(fields[i]);
            if (fields[i].function) {
                temp.function = shallowClone(fields[i].function);
            }
            resultFields.push(temp);
            const option = new Option(getOptionsTitle(resultFields[i]), i.toString());
            fieldSelect.appendChild(option);
        }


        let addButtons =this.createButtons(["Add", "Edit", "Delete"], {width: "100px", marginTop: "5px"});
        let addBtnContainer = document.createElement('div');
        addBtnContainer.style.padding = "5px";
        addBtnContainer.style.display = 'inline-block';
        addBtnContainer.style.verticalAlign = "top";
        addBtnContainer.appendChild(addButtons[0]);
        addBtnContainer.appendChild(document.createElement('br'));
        addBtnContainer.appendChild(addButtons[1]);
        addBtnContainer.appendChild(document.createElement('br'));
        addBtnContainer.appendChild(addButtons[2]);
        body.appendChild(addBtnContainer);



        addButtons[0].addEventListener("click", () => {
           this.calculationValueEditor("Text value", {text: ""}, (name, value) => {
                if (name != null && name !== '') {
                    if (!resultFields.hasOwnProperty(name)) {
                        fieldSelect.appendChild(new Option(name));
                    }
                    resultFields[name] = value;
                }
            });
        });

        // Edit
        addButtons[1].addEventListener("click", () => {
            let key = fieldSelect.value;
           this.calculationValueEditor(key, resultFields[key], (name, value) => {
                if (name !== key) {
                    delete resultFields[key];
                    fieldSelect.options[fieldSelect.selectedIndex].text = name;
                }
                //valueValue.innerText = value;
                resultFields[name] = value;
            });
        });

        // Delete
        addButtons[2].addEventListener("click", () => {
            if (fieldSelect.selectedIndex >= 0) {
                let key = fieldSelect.value;
                delete resultFields[key];
                fieldSelect.options[fieldSelect.selectedIndex] = null;
                //valueValue.innerText = '';
            }
        });




        // TODO: valid ops: concat, add, minus, multiply, divide
        // TODO: Fields, "Add Static", "Add Data Element", "Add Total", "Add Function"

        let buttons =this.createButtons(["Ok", "Cancel"]);
        let btnContainer = document.createElement('div');
        btnContainer.appendChild(buttons[0]);
        btnContainer.appendChild(buttons[1]);
        body.appendChild(btnContainer);

        let d = new Dialog("Calculation Editor", body, this.hostElement);

        buttons[0].addEventListener('click', () => {
            d.hide();
            if (typeof ok === 'function') {
                ok(nameValue.value, opValue.value, resultFields);
            }
        });
        buttons[1].addEventListener('click', () => {
            d.hide();
            if (typeof cancel === 'function') {
                cancel();
            }
        });
    }

    calculationValueEditor(name, value, ok, cancel) {
        const body = document.createElement('div');

        const nameDiv = document.createElement('div');
        const name1 = document.createElement('span');
        name1.innerText = "Type:";


        const variableName = document.createElement('input');
        variableName.value = name;
        nameDiv.appendChild(name1);
        nameDiv.appendChild(variableName);
        body.appendChild(nameDiv);

        const valueDiv = document.createElement('div');
        const value1 = document.createElement('span');
        value1.innerText = "Variable value:";
        const variableValue = document.createElement('input');
        variableValue.value = value;
        valueDiv.appendChild(value1);
        valueDiv.appendChild(variableValue);
        body.appendChild(valueDiv);

        let buttons =this.createButtons(["Ok", "Cancel"]);
        let btnContainer = document.createElement('div');
        btnContainer.appendChild(buttons[0]);
        btnContainer.appendChild(buttons[1]);
        body.appendChild(btnContainer);

        let d = new Dialog("Value Editor", body, this.hostElement);

        buttons[0].addEventListener('click', () => {
            d.hide();
            if (typeof ok === 'function') {
                ok(variableName.value, variableValue.value);
            }
        });
        buttons[1].addEventListener('click', () => {
            d.hide();
            if (typeof cancel === 'function') {
                cancel();
            }
        });
    }

    /**
     * Creates a select list of all the fonts the report has access too
     * @param selected
     * @returns {HTMLSelectElement}
     */
    createFontSelect(selected) {
        let builtInFonts=['Times','Helvetica','Courier','Symbol','Dingbats'];
        const selectList = document.createElement('select');
        selectList.className = "frSelect";
        for (let i=0;i<builtInFonts.length;i++) {
            let option = new Option(builtInFonts[i]);
            if (builtInFonts[i] === selected) { option.selected = true; }
            selectList.appendChild(option);
        }
        let additionalFonts = this._parent.additionalFonts;
        for (let i=0;i<additionalFonts.length;i++) {
            // Only add fonts that have data associated with them...
            if (additionalFonts[i].data && additionalFonts[i].data.length) {
                let option = new Option(this._fixShowPropertyTitle(additionalFonts[i].name), additionalFonts[i].name);
                if (additionalFonts[i].name === selected) {
                    option.selected = true;
                }
                selectList.appendChild(option);
            }
        }

        return selectList;
    }

    createDataSelect(report, field=null, dataSets=31, isTotal = false) {
        const selectList = document.createElement("select");
        selectList.className = "frSelect";
        const fields = report.reportFields;

        if ((dataSets & 32) === 32) { // jshint ignore:line
            let group = document.createElement("optgroup");
            group.label = "Bands";
            selectList.appendChild(group);
            let option = new Option("Text");
            option.tag = 32;
            if (field === "text") {
                option.selected = true;
            }
            group.appendChild(option);

            selectList.appendChild(group);
            option = new Option("Function");
            option.tag = 32;
            if (field === "function") {
                option.selected = true;
            }
            group.appendChild(option);
        }

        if ((dataSets & 1) === 1) { // jshint ignore:line
            let group = document.createElement("optgroup");
            group.label = "Primary Data";
            selectList.appendChild(group);
            for (let i = 0; i < fields.primary.length; i++) {
                const option = new Option(fields.primary[i]);
                option.tag = 1;
                option.dataSet = 0;
                if (field === fields.primary[i] && isTotal !== true) {
                    option.selected = true;
                }
                group.appendChild(option);
            }


            if ((dataSets & 2) === 2) { // jshint ignore:line
                for (let i = 1; i <= fields.levels; i++) {
                    if (fields['level' + i].length > 0) {
                        group = document.createElement("optgroup");
                        group.label = fields.titles[i];
                        for (let j = 0; j < fields['level' + i].length; j++) {
                            const option = new Option(fields['level' + i][j]);
                            option.tag = 2;
                            option.dataSet = i;
                            if (field === fields['level' + i][j]  && isTotal !== true) {
                                option.selected = true;
                            }
                            group.appendChild(option);
                        }
                        selectList.appendChild(group);
                    }
                }
            }
        }

        if ((dataSets & 4) === 4) { // jshint ignore:line
            const variables = report.reportVariables;
            if (variables != null) {
                if (field === "-unset-") {
                    const option = new Option("-unset-");
                    option.tag = 4;
                    option.selected = true;
                    selectList.appendChild(option);
                }
                let group = document.createElement("optgroup");
                group.label = "- Variables -";
                let count = 0;
                for (let key in variables) {
                    if (!variables.hasOwnProperty(key)) {
                        continue;
                    }
                    count++;
                    const option = new Option(key);
                    option.tag = 4;
                    if (field === key && isTotal !== true) {
                        option.selected = true;
                    }

                    group.appendChild(option);
                }
                if (count) {
                    selectList.appendChild(group);
                }
            }
        }

        if ((dataSets & 8) === 8) { // jshint ignore:line
            const calculations = report.reportCalculations;
            if (calculations.length) {
                if (field === "-unset-") {
                    const option = new Option("-unset-");
                    option.tag = 8;
                    option.selected = true;
                    selectList.appendChild(option);
                }

                let group = document.createElement("optgroup");
                group.label = "- Calculations -";
                for (let i = 0; i < calculations.length; i++) {
                    const option = new Option(calculations[i]);
                    option.tag = 8;
                    if (field === calculations[i] && isTotal !== true) {
                        option.selected = true;
                    }
                    group.appendChild(option);
                }
                selectList.appendChild(group);
            }
        }

        if ((dataSets & 16) === 16) { // jshint ignore:line
            if (field === "-unset-") {
                const option = new Option("-unset-");
                option.tag = 16;
                option.selected = true;
                selectList.appendChild(option);
            }

            const totals = report.reportTotals;
            let totalTypes = ['sum', 'min', 'max', 'count', 'average'];
            for (let s = 0; s < totalTypes.length;s++) {
                if (totals[totalTypes[s]] && totals[totalTypes[s]].length) {
                    let group = document.createElement("optgroup");
                    group.label = "- total " + totalTypes[s] + " -";
                    for (let i = 0; i < totals[totalTypes[s]].length; i++) {

                        const option = new Option(totals[totalTypes[s]][i]);
                        option.tag = 16;
                        if (field === totals[totalTypes[s]][i]) {
                            option.selected = true;
                        }
                        group.appendChild(option);
                    }
                    selectList.appendChild(group);
                }

            }

        }

        return selectList;
    }

    showProperties(obj, layout, refresh=false, overrideProps=null) {
        if (obj === layout.trackProperties) {
            if (refresh !== true) { return; }
        } else {
            // set refresh if we don't match type...
            refresh = true;
        }
        layout.trackCreated = [];
        if (refresh || obj == null) {
           this.clearArea(layout);
        }
        layout.trackProperties = obj;
        if (obj == null) { return; }

        let table = null;
        const tableCollection = layout.getElementsByClassName("frTableProps");
        if (tableCollection.length) {
            table = tableCollection[0];
        }
        if (!table) {
            table = document.createElement("table");
            table.id = "frTableProps";
        }

        if (!table.children.length) {
            let tr = table.insertRow(-1);
            let td = tr.insertCell(0);
            td.colSpan = 2;

            // TODO: Create list of all elements as a select list to select the element (Quick List at top of elements)
            let div = document.createElement('div');
            if (typeof obj.elementTitle !== 'undefined') {
                let span = document.createElement('span');
                div.appendChild(span);
                span.className = "frPropTitle";
                span.innerText = obj.elementTitle;
                table.className = "frTableProps";
            }
            td.appendChild(div);
            if (obj instanceof frElement) {
                let deleteIcon = document.createElement('span');
                deleteIcon.innerText = "\uE80B";
                deleteIcon.className = "frIcon frIconClickableNB";
                deleteIcon.style.position = "absolute";
                deleteIcon.style.right = "5px";
                deleteIcon.style.top = "3px";
                deleteIcon.addEventListener("click", () => {
                    obj.delete();
                });
                div.appendChild(deleteIcon);
            }

        }
        const props = overrideProps || obj.properties;
       this._handleShowProperties(props, obj, table, layout);
        layout.appendChild(table);

        // Might be able to scan the TR children
        let children = table.children[0].children;
        // Skip first row because it is our "Title" row....
        for (let i=1;i<children.length;i++) {
            if (layout.trackCreated.indexOf(children[i].id) < 0) {
                children[i].style.display = 'none';
            } else {
                children[i].style.display = '';
            }
        }


    }

    _fixShowPropertyTitle(name) {
        // TODO: Split on Upper case to add spaces
        return name.charAt(0).toUpperCase()+name.slice(1).split(/(?=[A-Z])/).join(' ');
    }

    _getShowPropertyId(prop, obj) {
        let name = 'fr_prop_';
        if (typeof prop === "string") {
            name += prop.replace(/\s/g, '');
        } else if (prop.title) {
            name += prop.title.replace(/\s/g, '');
        } else {
            name += prop.field.replace(/\s/g, '');
        }
        return name + "_"+obj.uuid;
    }

    _handleShowProperties(props, obj, table, layout) {
        for (let i = 0; i < props.length; i++) {
            if (props[i] && props[i].skip === true) { continue; }
            let name =this._getShowPropertyId(props[i],obj);
            let tr = layout.querySelector("#"+name);
            if (!tr) {
                tr = table.insertRow(-1);
                tr.id = name;
            }

           this._handleShowProperty(props[i], obj, name, tr, layout);
        }
    }

    _handleShowProperty(prop, obj, name, tr, layout) {
        layout.trackCreated.push(name);

        let td1, td2, created=true, value, input;
        if (tr.children.length) {
            if (tr.children.length === 1) {
                td1 = td2 = tr.children[0];
            } else {
                td1 = tr.children[0];
                td2 = tr.children[1];
            }
            input = td2.children[0];
            created = false;
            //return;
        } else {
            td1 = tr.insertCell(0);
            td2 = tr.insertCell(1);
        }

        if (typeof prop === "string") {
            console.error("Should not have any string properties", prop);
        } else {
            // COMPLEX Properties, full Objects passed in here
            if (prop.title || prop.field) {
                let lastProps = [];
                if (created) {
                    // Do we have proper type
                    if (prop.type) {
                        let propType = prop.type;
                        td1.innerText =this._fixShowPropertyTitle(prop.title || prop.field);
                        if (prop.field && obj[prop.field] && obj[prop.field].function) { propType = 'function'; }

                        switch (propType) {
                            case 'file':
                            case 'button':
                                input = document.createElement("input");
                                input.type = "button";
                                input.value = prop.title;
                                input.className = "frPropButton";
                                input.addEventListener("click", prop.click);
                                td2.appendChild(input);
                                td2.colSpan = 2;
                                td2.style.textAlign = "center";
                                tr.deleteCell(0);
                                break;

                            case 'selection':
                                const tempField = obj[prop.field];
                                input = document.createElement("select");
                                for (let i=0;i<prop.values.length;i++) {
                                    let opt = new Option(prop.values[i]);
                                    if (prop.values[i] === tempField) {
                                        opt.selected = true;
                                    }
                                    input.appendChild(opt);
                                }
                                input.id = name + "_select";
                                input.className = "frPropSelect";
                                input.addEventListener("change", () => {
                                    if (typeof prop.translate === 'function') {
                                        obj[prop.field] = prop.translate(input.value);
                                    } else {
                                        obj[prop.field] = input.value;
                                    }
                                    if (prop.onchange) { prop.onchange(input.value); }
                                });
                                td2.appendChild(input);
                                break;

                            case 'select':
                                input = prop.display(prop);
                                input.id = name + "_select";
                                input.className = "frPropSelect";
                                input.addEventListener("change", () => {
                                    if (typeof prop.translate === 'function') {
                                        obj[prop.field] = prop.translate(input.value);
                                    } else {
                                        obj[prop.field] = input.value;
                                    }
                                    if (prop.onchange) { prop.onchange(input.value); }
                                });
                                td2.appendChild(input);
                                break;

                            case 'display':
                                input = prop.display(prop);
                                td2.appendChild(input);
                                break;

                            case 'boolean':
                                input = document.createElement('input');
                                input.type = 'checkbox';
                                input.className = "frPropCheck";
                                input.addEventListener('change', () => {
                                    if (typeof prop.translate === 'function') {
                                        obj[prop.field] = prop.translate(input.checked);
                                    } else {
                                        obj[prop.field] = input.checked;
                                    }
                                });
                                td2.appendChild(input);
                                input.checked = !!obj[prop.field];
                                if (prop.functionable === true) {
                                    td2.appendChild(this._createFunctionSpan(obj, prop, layout));
                                }

                                break;

                            case 'string':
                            case 'number':
                                input = document.createElement('input');
                                input.type = typeof value === 'number' ? 'number' : 'input';
                                input.style.margin = "1px";
                                if (prop.functionable === true) {
                                    input.style.width = "calc(100% - 20px)";
                                }
                                input.className = "frPropInput";

                                input.addEventListener('input', () => {
                                    if (typeof prop.translate === 'function') {
                                        obj[prop.field] = prop.translate(input.value);
                                    } else {
                                        obj[prop.field] = input.value;
                                    }
                                });

                                td2.appendChild(input);
                                if (prop.functionable === true) {
                                    td2.appendChild(this._createFunctionSpan(obj, prop, layout));
                                }
                                input.value = obj[prop.field] || "";
                                break;

                            case 'function':
                                input = document.createElement('span');
                                input.innerText = "{FUNC}";
                                input.className = "frPropFunction";
                                const innerSpan = document.createElement('span');
                                innerSpan.style.position = "absolute";
                                innerSpan.style.right = "20px";
                                innerSpan.className = "frIcon frIconClickable";
                                innerSpan.innerText = "\ue81f";
                                innerSpan.style.border = "solid black 1px";
                                innerSpan.addEventListener("click", () => {
                                   this.functionEditor(obj[prop.field].function, null,null, null, (result) => {
                                        if (obj[prop.field].function !== result) {
                                            obj[prop.field].function = result;
                                            // Clear any cached Preview func object
                                            delete obj[prop.field].func;
                                        }
                                    });
                                });

                                const deleteSpan = document.createElement('span');
                                deleteSpan.style.position = "absolute";
                                deleteSpan.style.right = "4px";
                                deleteSpan.className = "frIcon frIconClickable";
                                deleteSpan.innerText = "\uE80B";
                                deleteSpan.style.border = "solid black 1px";
                                deleteSpan.addEventListener("click", () => {
                                    obj[prop.field] = '';
                                   this.showProperties(layout.trackProperties, layout, true);
                                });

                                input.appendChild(innerSpan);
                                input.appendChild(deleteSpan);
                                td2.appendChild(input);
                                break;


                            case 'totals':
                                // TODO: Totals???
                                console.log("TODO: totals in  _handleShowProperty");
                                break;


                            default:
                                console.log("fluentReports: Unknown properties type", prop.type);
                        }

                        // Additional sub-properties because of something changed
                        if (prop.properties) {
                            input.addEventListener('change', () => {
                                let p = prop.properties();
                                for (let i = 0; i < lastProps.length; i++) {
                                    if (p.indexOf(lastProps[i]) < 0) {
                                        let name =this._getShowPropertyId(lastProps[i], obj) + "_sub";
                                        let h = layout.querySelector("#" + name);
                                        if (h) {

                                            h.style.display = 'none';
                                        }
                                    }
                                }
                                if (p.length) {
                                   this._handleShowProperties(p, obj, tr.parentElement, layout);
                                }
                                lastProps = p;
                            });

                            // Check to see if any props need to be added when re-rebuild the layout...
                            let p = prop.properties();
                            if (p.length) {
                               this._handleShowProperties(p, obj, tr.parentElement, layout);
                            }
                            lastProps = p;
                        }
                    }
                } else {  // We are on the update path
                    if (prop.type) {
                        switch (prop.type) {
                            case "selection":
                            case "select":
                                input = layout.querySelector("#" + name + "_select");
                                if (input) {
                                     input.value = obj[prop.field];
                                } else {
                                    console.warn("fluentReports: unable to find ", name + "_select");
                                }
                                break;

                            case 'button': break;
                            case 'display': break;
                            case 'totals': break;
                            case 'boolean': break;
                            case 'string': break;
                            case 'number': break;
                            // These don't have anything to update...

                            default:
                                console.error("fluentReports: Missing update path for properties", prop.type, name);
                        }
                    }
                    if (prop.properties) {
                        let p = prop.properties();
                        if (p.length) {
                           this._handleShowProperties(p, obj, tr.parentElement, layout);
                        }
                        lastProps = p;
                    }
                }
            } else {
                if (this.debugging) {
                    console.error("fluentReports: Unknown property", prop);
                }
            }
        }
    }

    _createFunctionSpan(obj, prop, layout) {
        const functionSpan = document.createElement('span');
        functionSpan.style.position = "absolute";
        functionSpan.style.right = "4px";
        functionSpan.style.marginTop = "4px";
        functionSpan.className = "frIcon frIconClickable";
        functionSpan.innerText = "\ue81f";
        functionSpan.style.border = "solid black 1px";
        functionSpan.addEventListener("click", () => {
           this.functionEditor("return '"+obj[prop.field]+"';", null,null, null, (result) => {
                obj[prop.field] = {type: 'function', name: 'Function', function: result, async: false};
               this.showProperties(layout.trackProperties, layout, true);
            });
        });
        return functionSpan;
    }

    createButtons(buttons, styles) {
        let results = [];
        for (let i=0;i<buttons.length;i++) {
            //const tempButton = document.createElement("input");
            const tempButton = document.createElement("button");
            tempButton.type = "button";
            tempButton.innerText = buttons[i];
            tempButton.className = "frIcon";
            tempButton.style.height = "30px";
            tempButton.style.minWidth = "100px";
            tempButton.style.marginRight = "5px";
            if (styles) {
                for (let key in styles) {
                    if (!styles.hasOwnProperty(key)) { continue; }
                    tempButton.style[key] = styles[key];
                }
            }

            //tempButton.style.verticalAlign = "center";
            results.push(tempButton);
        }
        return results;
    }

    /**
     * General function to remove all sub-children, used by many of the functions
     * @param ScreenDiv
     */
    clearArea(ScreenDiv) { // jshint ignore:line
        // Could be faster by detaching the ScreenDiv; then deleting everything, and re-adding -- but at this point it isn't a big issue.
        while (ScreenDiv.firstElementChild) {
            ScreenDiv.removeChild(ScreenDiv.firstElementChild);
        }
    }
}

/**
 * Simple dialog Class
 */
class Dialog { // jshint ignore:line

    constructor(title, body, host) {
        this._boundKeyHandler = this._keyHandler.bind(this);
        this._dialogId = 0;
        if (host) {
            this._host = host;
        } else {
            console.error("Using BODY for dialog");
            this._host = document.getElementsByTagName("body");
        }
        if (typeof this._host.dialogCount === 'undefined') {
            this._host.dialogCount = 0;
        }

        if (title && body)  {
            this.show(title, body);
        }
    }

    _keyHandler(event) {
            if (event.key === "Escape") {
                if (this._dialogId !== this._host.dialogCount) { return; }
                this.hide();
                event.stopPropagation();
                return false;
            }
    }

    hide() {
        let dialogBackground = this._host.querySelector("#frDialogBackground" + this._host.dialogCount);
        if (!dialogBackground) {
            console.error("fluentReportsGenerator: missing background", this._host.dialogCount);
            return;
        }
        dialogBackground.style.display = "none";
        let dialog = this._host.querySelector("#frDialog"+this._host.dialogCount);
        dialog.style.display = "none";

        // Do not do this: clearArea(dialog) - Clearing the dialog means the code following a hide has no access to the data the dialog contains...
        this._host.dialogCount--;
        document.removeEventListener("keydown", this._boundKeyHandler);
    }

    show(title, content) {
        this._host.dialogCount++;
        this._dialogId = this._host.dialogCount;

        let dialogBackground = this._host.querySelector("#frDialogBackground"+this._host.dialogCount);
        if (!dialogBackground) {
            dialogBackground = document.createElement("div");
            dialogBackground.id = "frDialogBackground"+this._host.dialogCount;
            dialogBackground.style.position = "absolute";
            dialogBackground.className = "frDialogBackground";
            dialogBackground.style.left = "0px";
            dialogBackground.style.right = "0px";
            dialogBackground.style.top = "0px";
            dialogBackground.style.bottom = "0px";
            dialogBackground.style.backgroundColor = "#000000";
            dialogBackground.style.opacity = "0.7";
            this._host.appendChild(dialogBackground);
        } else {
            dialogBackground.style.display='';
        }

        let dialog = this._host.querySelector('#frDialog'+this._host.dialogCount);
        if (!dialog) {
            dialog = document.createElement("div");
            dialog.id = "frDialog"+this._host.dialogCount;
            dialog.className = "frDialog";
            dialog.style.position = "absolute";

            const rect = this._host.getBoundingClientRect();
            if (rect.height > 300) {
                dialog.style.top = "20%";
            } else {
                dialog.style.top = "0px";
            }
            dialog.style.left = "33%";
//            dialog.style.width = content.style.width === "" ? content.style.width : "33%";
            dialog.style.minWidth = "300px";
            //dialog.style.transform = "translate(-50%, -50%);";
            dialog.style.backgroundColor = "#FFFFFF";
            dialog.style.border = "solid 2px black";
            this._host.appendChild(dialog);
        } else {
            dialog.style.display = '';
           this.clearArea(dialog);
        }

        let titleElement = document.createElement("div");
        titleElement.style.backgroundColor = "#aaaaaa";
        titleElement.style.textAlign = "center";
        titleElement.style.color = "#000000";
        titleElement.style.borderBottom = "1px solid black";
        titleElement.innerText = title;
        titleElement.style.marginBottom = "20px";
        dialog.appendChild(titleElement);
        let contentElement = document.createElement("div");
        contentElement.style.padding = "5px";
        dialog.appendChild(contentElement);
        if (content instanceof HTMLElement) {
            contentElement.appendChild(content);
        } else {
            contentElement.innerHTML = content;
        }
        document.addEventListener("keydown", this._boundKeyHandler);
    }

    clearArea(ScreenDiv) { // jshint ignore:line
        // Could be faster by detaching the ScreenDiv; then deleting everything, and re-adding -- but at this point it isn't a big issue.
        while (ScreenDiv.firstElementChild) {
            ScreenDiv.removeChild(ScreenDiv.firstElementChild);
        }
    }

    notice(data, color, frame) {
        let notice = document.getElementById("notice");
        if (!notice) {
            if (data === false) { return; }
            notice = document.createElement('div');
            notice.id = 'notice';
            notice.style.background = '#A00';
            notice.style.textAlign = 'center';
            notice.style.position = 'fixed';
            notice.style.left = '0';
            notice.style.right = '0';
            notice.style.top = "0px";
            notice.style.color = '#FFF';
            frame.appendChild(notice);
        }
        if (this._noticeId !== null) {
            clearTimeout(this._noticeId);
            this._noticeId = null;
        }

        if (data === false) {
            notice.style.display = 'none';
            return;
        }
        if (color !== null && color !== undefined) {
            notice.style.background = color;
        } else if (notice.style.background !== '#A00') {
            notice.style.background = '#A00';
        }
        notice.style.display = '';
        notice.innerHTML = data;
        this._noticeId = setTimeout(() => {
            notice.style.display = 'none';
            this._noticeId = null;
        }, 7000);
    }
}

/**
 * Simple helper function to do shallow clones
 * @param value
 * @param skipValues
 */
function shallowClone(value, skipValues=[]) { // jshint ignore:line
    let result = {};
    for (let key in value) {
        if (!value.hasOwnProperty(key)) { continue; }
        if (skipValues.indexOf(key) >= 0) { continue; }
        result[key] = value[key];
    }
    return result;
}

window.FluentReportsGenerator = FluentReportsGenerator;