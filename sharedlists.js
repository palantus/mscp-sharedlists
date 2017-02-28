"use strict"

class Handler{

  async initFirst(){
    this.global.cachedStorage = {}
    this.global.storageGetPromises = {}

    setInterval(() => this.global.cachedStorage = {}, 120000) //Clear cache every 2 minutes to be on the safe side
  }

  async GetBucket(id){
    let bucket = await this.getStorageValue("sharedlists_bucket_" + id, {Title: "New bucket", bucketId: id, lists: []})
    let listId2Name = await this.getStorageValue("sharedlists_list_id_to_name", {})
    for(let i = 0; i < bucket.lists.length; i++){
      let title = listId2Name[bucket.lists[i]]
      if(title === undefined)
        title = "New list"

      bucket.lists[i] = {Title: title, id: bucket.lists[i]}
    }
    return bucket;
  }

  async GetList(id){
    let items = await this.getStorageValue("sharedlists_list_" + id, [])
    let listId2Name = await this.getStorageValue("sharedlists_list_id_to_name", {})
    return {listId: id, Title: listId2Name[id] !== undefined ? listId2Name[id] : "New list", items: items}
  }

  async AddListToBucket(bucketId, listId){
    let bucket = await this.getStorageValue("sharedlists_bucket_" + bucketId, {Title: "New bucket", bucketId: bucketId, lists: []})
    if(bucket.lists.indexOf(listId) < 0){
      bucket.lists.push(listId)
    }
    this.setStorageValue("sharedlists_bucket_" + bucketId, bucket)
    return this.GetBucket(bucketId)
  }

  async RemoveListFromBucket(bucketId, listId){
    let bucket = await this.getStorageValue("sharedlists_bucket_" + bucketId, {Title: "New bucket", bucketId: bucketId, lists: []})
    if(bucket.lists.indexOf(listId) >= 0){
      bucket.lists.splice(bucket.lists.indexOf(listId), 1)
    }
    this.setStorageValue("sharedlists_bucket_" + bucketId, bucket)
    return this.GetBucket(bucketId)
  }

  async AddListItem(listId, title){
    let items = await this.getStorageValue("sharedlists_list_" + listId, [])
    items.push({id: this.guid(), Title: title, finished: false})
    this.setStorageValue("sharedlists_list_" + listId, items)
    return this.GetList(listId)
  }

  async ToggleListItem(listId, itemId){
    let items = await this.getStorageValue("sharedlists_list_" + listId, [])
    for(let i = 0; i < items.length; i++){
      if(items[i].id == itemId)
        items[i].finished = !items[i].finished
    }
    this.setStorageValue("sharedlists_list_" + listId, items)
    return this.GetList(listId)
  }

  async ClearCompleted(listId){
    let items = await this.getStorageValue("sharedlists_list_" + listId, [])
    for(let i = 0; i < items.length; i++){
      if(items[i].finished)
        items.splice(i, 1)
    }
    this.setStorageValue("sharedlists_list_" + listId, items)
    return this.GetList(listId)
  }

  async ChangeListName(listId, name){
    let listId2Name = await this.getStorageValue("sharedlists_list_id_to_name", {})
    listId2Name[listId] = name;
    this.setStorageValue("sharedlists_list_id_to_name", listId2Name)
    return this.GetList(listId)
  }

  async ChangeBucketName(id, name){
    let bucket = await this.getStorageValue("sharedlists_bucket_" + id, {Title: "New bucket", bucketId: id, lists: []})
    bucket.Title = name;
    this.setStorageValue("sharedlists_bucket_" + id, bucket)
    return this.GetBucket(id)
  }

  async RenameListItem(listId, itemId, name){
    let items = await this.getStorageValue("sharedlists_list_" + listId, [])
    for(let i = 0; i < items.length; i++){
      if(items[i].id == itemId)
        items[i].Title = name
    }
    this.setStorageValue("sharedlists_list_" + listId, items)
    return this.GetList(listId)
  }

  async GetBucketFull(id){
      let bucket = await this.getStorageValue("sharedlists_bucket_" + id, {Title: "New bucket", bucketId: id, lists: []})
      for(let i = 0; i < bucket.lists.length; i++){
        bucket.lists[i] = await this.GetList(bucket.lists[i])
      }
      return bucket;
  }

  async getStorageValue(key, defaultValue){
    let promise = this.global.storageGetPromises[key]
    if(promise !== undefined)
      await promise;

    if(this.global.cachedStorage[key] !== undefined){
      return JSON.parse(this.global.cachedStorage[key]);
    }
    this.global.storageGetPromises[key] = this.mscp.storage.get(key, defaultValue)
    let value = await this.global.storageGetPromises[key]
    this.global.cachedStorage[key] = JSON.stringify(value);
    return value;
  }

  setStorageValue(key, value){
    this.global.cachedStorage[key] = JSON.stringify(value);
    this.mscp.storage.set(key, value)
  }

  s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
               .toString(16)
               .substring(1);
  };

  guid() {
    return this.s4() + this.s4() + '-' + this.s4() + '-' + this.s4() + '-' +
           this.s4() + '-' + this.s4() + this.s4() + this.s4();
  }
}

module.exports = Handler
