const express = require('express')
const {
    success,
    failure,
    asyncHandler,
    errorHandler,
    createCrudRouter,
} = require('../index')
const { promise, object } = require('zod')
const { describe } = require('zod/v4/core')
const { memo } = require('react')
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

describe('envelope', ()=>{
    test('success has data and a null error', () => {
        expect(success({}))
    })
    test('failure has null data and an error with a message and code', () =>{
        expect(failure('Nope', 'BAD')).toEqual({
            success: false,
            data: null,
            error: { message: 'Nope', code: "BAD"},
        })
    })
})

describe('asyncHandler', () => {
    test('passes a rejected promise to next', async()=>{
        const boom = new Error('boom')
        const next  = jest.fn()
        await asyncHandler(async () =>{
            throw boom
        })({}, {}, next)
        expect(next).toHaveBeenCalledWith(boom)
    })
})

describe('createCrudRouter', () => {
    test('Throws BAD_REPOSITORY when methods are missing', () => {
        expect(() => createCrudRouter()).toThrow(expect.objectContaining({code: 'BAD_REPOSITORY'}))
        expect(()=> createCrudRouter({findAll() {}})).toThrow(
            expect.objectContaining({ code: 'BAD_REPOSITORY'})
        )
    })
    test('POST creates an item and returns 201', async()=>{
        await start(memoryRepo())
        const res = await call('POST', '', {name: 'lamp'})
        expect(res.status).toBe(201)
        expect(res.body.success).toBe(true)
        expect(res.body.data).toEqual({ id: '1', name: 'lamp'})
    })
})
