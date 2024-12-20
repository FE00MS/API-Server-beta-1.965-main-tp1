import NewModel from '../models/post.js';
import Repository from '../models/repository.js';
import Controller from './Controller.js';

export default
    class NewsController extends Controller {
    constructor(HttpContext) {
        super(HttpContext, new Repository(new NewModel()));
    }

}