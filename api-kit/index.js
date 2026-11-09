const express = require('express')
const { it } = require('zod/locales')
class ApiError extends Error{
    constructor(code, message){
        super(message)
        this.name = 'ApiError'
        this.code = code
    }
}

function success(data){
    return {success: true, data, error:null}
}
function failure(message, code){
    return {success: false, data: null, error: {message, code}}
}
function asyncHandler(fn){
    return(req, res, next) => Promise.resolve(fn(req,res,next)).catch(next)
}
function errorHandler(err,req,res,next){
    const status = err.status || err.statusCode || 500
    const message = status >= 500 ? 'Something went wrong': err.message
    res.status(status).json(failure(message, err.code || 'ERROR'))
}
const REPO_METHODS = ['findAll', 'findById', 'create', 'update', 'remove']

function createCrudRouter(repository){
    const missing = REPO_METHODS.filter(
        (name) => !repository || typeof repository[name] !== 'function'
    )
    if(missing.length > 0){
        throw new ApiError('BAD_REPOSITORY', `Repository is missing: ${missing.join(', ')}`)
    }
    const router = express.Router()
    router.use(express.json())
    const notFound = (res) => res.status(404).json(failure('Not found', 'NOT_FOUND'))
    router.get('/', asyncHandler(async (req,res)=>{
        res.json(success(await repository.findAll()))
    }))
    router.get('/:id', asyncHandler(async (req,res)=>{
        const item = await repository.findById(req.params.id)
        if (!item) return notFound(res)
        res.json(success(item))
    }))
    router.post('/', asyncHandler(async (req,res)=>{
        res.status(201).json(success(await repository.create(req.body)))
    }))
    router.put('/:id', asyncHandler(async (req,res)=>{
        const item = await repository.update(req.params.id, req.body)
        if(!item) return notFound(res)
        res.json(success(item))
    }))
    router.delete('/:id', asyncHandler(async (req,res)=>{
        const item = await repository.remove(req.params.id)
        if(!item) return notFound(res)
        res.json(success(item))
    }))
    return router
}
module.exports = { success, failure, asyncHandler, errorHandler, createCrudRouter, ApiError}