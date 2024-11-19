import Model from './model.js';

export default class New extends Model {
    constructor() {
        super(true /*secure Id*/);

        this.addField('Title', 'string');
        this.addField('Text', 'string');
        this.addField('Category', 'string');
        this.addField('Image', 'asset');
        this.addField('Creation', 'integer');

        this.setKey("Title");
    }
}