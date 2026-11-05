const mongoose = require('mongoose')
const {connect, withDefaults, createRepository} = require('../index')
const validId = '64b7f0c2a1b2c3d4e5f60718'

function fakeModel(){
    return{
        find: jest.fn().mockResolvedValue([{name: 'a'}, {name: 'b' }]),
        findById: jest.fn().mockResolvedValue({name : 'a'}),
        create: jest.fn(async (data) => ({...data})),
        findByIdAndUpdate: jest.fn(async(id,data)=>({...data})),
        findByIdAndDelete: jest.fn().mockResolvedValue({name: 'a'})
    }
}

describe('connect', () => {
    test('throws NO_URI without a uri', async()=>{
        await expect(connect()).rejects.toMatchObject({code: 'NO_URI'})
    })
})
