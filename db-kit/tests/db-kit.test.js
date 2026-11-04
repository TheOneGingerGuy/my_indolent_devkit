const mongoose = require('mongoose')
const {connect, withDefaults, createRepository} = require('../index')
const validId = '64b7f0c2a1b2c3d4e5f60718'

function fakeModel(){
    return{
        find: jest.fn().mockResolvedValue([{name: 'a'}, {name: 'b' }])
    }
}