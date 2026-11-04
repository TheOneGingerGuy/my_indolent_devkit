const mongoose = require('mongoose')

 class DbError extends Error {
    constructor(code,message){
        super(message)
        this.name = 'DbError'
        this.code = code
    }
 }

 async function connect(uri, options = {}) {
    if (!uri){
        throw new DbError('NO_URI', 'connect needs a mongoDB URI')
    }
    await mongoose.connect(uri, options)
    return mongoose.connection
 }

 function disconnect(){
    return mongoose.disconnect()
 }

 function withDefaults(fields, options = {}) {
    return new mongoose.Schema(fields, {
        timestamps: true,
        toJSON: {
            virtuals: true,
            versionKey: false,
            transform(doc, ret){
                delete ret._id
                return ret
            },
        },
        ...options,
    })
 }

 function createRepository(model){
    if(!model || typeof model.findById !== 'function'){
        throw new DbError('BAD_MODEL', 'createRepository needs a mongoose model')
    }
    const isValidId = (id) => mongoose.isValidObjectId(id)
    return{
        async findAll(filter = {}){
            return model.find(filter)
        },
        async findById(id){
            if (!isValidId(id)) return null
            return model.findById(id)
        },
        async create(data){
            return model.create(data)
        },
        async update(id, data){
            if(!isValidId(id)) return null
            return model.findByIdAndUpdate(id,data, {new: true, runValidators: true})
        },
        async remove(id){
            if(!isValidId(id)) return null
            return model.findByIdAndDelete(id)
        }
    }
 }

 module.exports = {connect, disconnect, withDefaults, createRepository, DbError}