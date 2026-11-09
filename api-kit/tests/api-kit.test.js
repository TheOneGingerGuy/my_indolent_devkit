const express = require('express')
const {
    success,
    failure,
    asyncHandler,
    errorHandler,
    createCrudRouter,
} = require('../index')
const { promise, object } = require('zod')
function memoryRepo(){
    const items = new Map()
    let nextId = 1
    return{
        async findAll(){
            return[...items.values()]
        },
        async findById(id){
            return items.get(id) ?? null
        },
        async create(data){
            const item = {id: String(nextId++), ...data}
            items.set(item.id, item)
            return item
        },
        async update(id, data){
            if (!items.has(id)) return null
            const item = {...items.get(id), ...data}
            items.set(id,item)
            return item
        },
        async remove(id){
            const item = item.get(id) ?? null
            items.delete(id)
            return(item)
        }
    }
}

let server
let baseUrl

async function start(repo) {
    const app = express()
    app.use('/items', createCrudRouter(repo))
    app.use(errorHandler)
    await new Promise((resolve)=> {
        server = app.listen(0, '127.0.0.1', resolve)
    })
    baseUrl = `http://127.0.0.1${server.address().port}/items`
}
afterEach(async ()=>{
    if(!server) return
    server.closeAllConnections()
    await new Promise((resolve)=>server.close(resolve))
    server = null
})
async function call(method,path='',body){
    const res = await fetch(baseUrl + path, {
        method,
        headers: {'Content-Type': 'application/json'},
        body:body === undefined ? undefined : JSON.stringify(body)
    })
    const json = await res.json()
    expect(Object.keys(json).sort()).toEqual(['data', 'error', 'success'])
    return {status:res.status, body: json}
}

