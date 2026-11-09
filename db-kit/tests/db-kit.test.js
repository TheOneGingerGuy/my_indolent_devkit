const mongoose = require('mongoose')
const {connect, withDefaults, createRepository} = require('../index')
const VALID_ID = '64b7f0c2a1b2c3d4e5f60718'

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

describe('with defaults', ()=>{
    const schema = withDefaults({name: String})
    const Thing = mongoose.model('Thing', schema)
    test('turns on timestamps', ()=>{
        expect(schema.options.timestamps).toBe(true)
    })
    test('JSON output has id, and no _id or __v',()=>{
        const json = new Thing({name: 'lamp'}).toJSON()
        expect(json.name).toBe('lamp')
        expect(typeof json.id).toBe('string')
        expect(json._id).toBeUndefined();
        expect(json.__v).toBeUndefined();
    })
})

describe('createRepository', () => {
    test('throws BAD_MODEL without a model', () => {
        expect(() => createRepository()).toThrow(expect.objectContaining({code: 'BAD_MODEL'}))
        expect(()=> createRepository({})).toThrow(expect.objectContaining({code: 'BAD_MODEL'}))
    })
    test('returns these functions exactly', () => {
    const repo = createRepository(fakeModel())
    expect(Object.keys(repo).sort()).toEqual(['create', 'findAll', 'findById', 'remove', 'update'])
    })
    test('findAll passes the filter through to the model', async ()=>{
        const Model = fakeModel()
        const result = await createRepository(Model).findAll({name: 'a'})
        expect(Model.find).toHaveBeenCalledWith({name: 'a'})
        expect(result).toHaveLength(2)
    })
    test('findById returns the doc for a valid ID', async () => {
        const Model = fakeModel()
        expect(await createRepository(Model).findById(VALID_ID)).toEqual({name: 'a'})
        expect(Model.findById).toHaveBeenCalledWith(VALID_ID)
    })
    test('findById return null for a missing doc', async () => {
        const Model = fakeModel()
        Model.findById.mockResolvedValue(null)
        expect(await createRepository(Model).findById(VALID_ID)).toBeNull()
    })
    test('a badly formed id return null', async () => {
        const Model = fakeModel()
        const repo = createRepository(Model)
        expect(await repo.findById('not-an-id')).toBeNull()
        expect(await repo.update('not-an-id', {name: 'x'})).toBeNull()
        expect(await repo.remove('not-an-id')).toBeNull()
        expect(Model.findById).not.toHaveBeenCalled()
        expect(Model.findByIdAndUpdate).not.toHaveBeenCalled()
        expect(Model.findByIdAndDelete).not.toHaveBeenCalled()
    })
    test('create passed data to the model', async () => {
        const Model = fakeModel()
        expect(await createRepository(Model).create({name: 'new'})).toEqual({name: 'new'})
        expect(Model.create).toHaveBeenCalledWith({name: 'new'})
    })
    test('update return the new version and runs the validators', async () =>{
        const Model = fakeModel()
        await createRepository(Model).update(VALID_ID, {name: 'changed'})
        expect(Model.findByIdAndUpdate).toHaveBeenCalledWith(
            VALID_ID,
            {name:'changed'},
            {new: true, runValidators: true}
        )
    })
    test('removes deletes by id', async () => {
        const Model = fakeModel()
        await createRepository(Model).remove(VALID_ID)
        expect(Model.findByIdAndDelete).toHaveBeenCalledWith(VALID_ID)
    })
})
