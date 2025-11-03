export interface BrewfatherNotification {
  "id": "GRAVITYMON",
  "type": "iSpindel",
  "time": number,
  "temp": number,
  "sg": number,
  "angle": number,
  "battery": number,
  "rssi": number,
  "interval": number,
}

export interface BrewfatherBatch {
  "_id": string,
  "batchNo": number,
  "brewDate": number,
  "brewer": string,
  "name": string,
  "recipe": {
    "name": string
  },
  "status": string
}