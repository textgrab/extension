export interface Serializable {
    [key: string]: string | boolean | number;

    // The name of the serializable model
    _serializedKey: string;
}

class StorageService {
    StorageService() {
        console.log("Storage Service Initiated");
    }

    static async get<DataType extends Serializable>(defaultData: DataType): Promise<DataType> {
        const res = await chrome.storage.sync.get({ [defaultData._serializedKey]: defaultData });

        return res[defaultData._serializedKey] as DataType;
    }

    static set<DataType extends Serializable>(newData: DataType): Promise<void> {
        return chrome.storage.sync.set({ [newData._serializedKey]: newData });
    }
}


export default StorageService;