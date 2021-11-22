import { LightningElement, api } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';

import PARSER from '@salesforce/resourceUrl/PapaParse';
import sheetjs from '@salesforce/resourceUrl/sheetjs';

import getMapping from '@salesforce/apex/ContactUploadCtrl.getExcelMapping';
import createContacts from '@salesforce/apex/ContactUploadCtrl.createContacts';

let XLS = {};

export default class ContactUpload extends LightningElement {
    @api recordId;
    contacts
    mapping = {};

    connectedCallback() {
        this.loadScripts();
        this.fillMetadataMapping();
    }
    
    loadScripts() {
        Promise.all([
            loadScript(this, sheetjs + '/sheetjs/sheetmin.js'),
            loadScript(this, PARSER)
        ]).then(() => {
            XLS = XLSX;
        })
    }

    handleUploadFinished(event){
        const uploadedFiles = event.detail.files;
        if(uploadedFiles.length > 0) {   
            this.generateCSVFromExcel(uploadedFiles[0])
        }
    }

    generateCSVFromExcel(file) {
        let reader = new FileReader();
        reader.onload = event => {
            let data = event.target.result;
            let workbook = XLS.read(data, {
                type: 'binary'
            });
            let csvData = XLS.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]);
            this.parseCSV(csvData);
        };
        reader.onerror = error => {
            // handle error
        };
        reader.readAsBinaryString(file);
    }

    parseCSV(csvFile) {
        console.log('3');
        Papa.parse(csvFile, {
            quoteChar: '"',
            delimiter: '',
            header: 'true',
            encoding: 'utf-8',
            complete: results => {
                this.csvParserCompletionHander(results);
            },
            error: error => {
                // handle errors
            }
        });
    }

    csvParserCompletionHander(results) {
        const rows = results.data;
        this.contacts = rows.map(row => this.processRowData(row));
        this.contacts = this.contacts.filter(contact => contact['LastName']);
   
        this.callServerToCreateContacts();
    }

    processRowData(row) {
        for (const objPair of Object.entries(row)) {
           this.modifyDataProperties(objPair, row);
        }

        row['sobjectType'] = 'Contact';
        row['AccountId'] = this.recordId;

        return row;
    }


    fillMetadataMapping() {
        getMapping().then(res => {
            res.forEach(record => 
                this.mapping[record['MasterLabel']] =  {
                    apiName: record['DeveloperName'],
                    dataType: record['FieldType__c']
                }
            );
        });
    }

    modifyDataProperties([key, value], row) {
        delete row[key];

        const metadata = this.mapping[key.trim()];
        if (!metadata) return;
        
        const fieldAPIName = metadata['apiName'];
        const dataType = metadata['dataType'];

        if (dataType == 'Date') {
            value =  new Date(value);
        } 

        row[fieldAPIName] = value;

        return row;
    }

    callServerToCreateContacts() {
        createContacts({ contacts: this.contacts })
            .then(() => {
                // handle success
            }).catch(error => {
                // handle errors

            });
    }
}