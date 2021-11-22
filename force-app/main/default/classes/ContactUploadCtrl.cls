public without sharing class ContactUploadCtrl {
    
    @AuraEnabled
    public static List<ExcelContactMapping__mdt> getExcelMapping() {
        return ExcelContactMapping__mdt.getall().values();
    }

    @AuraEnabled
    public static void createContacts(List<SObject> contacts) {
        insert contacts;
    }
}
