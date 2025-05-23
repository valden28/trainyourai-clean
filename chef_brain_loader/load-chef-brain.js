var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var fs = require('fs');
var path = require('path');
var dotenv = require('dotenv');
var createClient = require('@supabase/supabase-js').createClient;
var OpenAI = require('openai');
dotenv.config();
// Validate env
if (!process.env.OPENAI_API_KEY || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing environment variables. Please check .env');
}
var openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
var supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
function embedAndUpload(filePath, source) {
    return __awaiter(this, void 0, void 0, function () {
        var fullText, chunks, _i, chunks_1, chunk, embeddingRes, embedding, error;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    fullText = fs.readFileSync(filePath, 'utf-8');
                    chunks = fullText.match(/[^\n]{100,1000}(\n|$)/g) || [];
                    _i = 0, chunks_1 = chunks;
                    _a.label = 1;
                case 1:
                    if (!(_i < chunks_1.length)) return [3 /*break*/, 5];
                    chunk = chunks_1[_i];
                    return [4 /*yield*/, openai.embeddings.create({
                            model: 'text-embedding-ada-002',
                            input: chunk.trim()
                        })];
                case 2:
                    embeddingRes = _a.sent();
                    embedding = embeddingRes.data[0].embedding;
                    return [4 /*yield*/, supabase.from('chef_brain').insert({
                            assistant_id: 'chef',
                            topic: path.basename(filePath, '.txt'),
                            source: source,
                            content: chunk.trim(),
                            embedding: embedding
                        })];
                case 3:
                    error = (_a.sent()).error;
                    if (error) {
                        console.error('Supabase insert error:', error);
                    }
                    else {
                        console.log("Uploaded chunk from ".concat(filePath));
                    }
                    _a.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 1];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function () {
        var folder, files, _i, files_1, file, filePath;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    folder = path.join(__dirname, 'chef-knowledge');
                    if (!fs.existsSync(folder)) {
                        throw new Error('chef-knowledge folder not found.');
                    }
                    files = fs.readdirSync(folder).filter(function (f) { return f.endsWith('.txt'); });
                    _i = 0, files_1 = files;
                    _a.label = 1;
                case 1:
                    if (!(_i < files_1.length)) return [3 /*break*/, 4];
                    file = files_1[_i];
                    filePath = path.join(folder, file);
                    return [4 /*yield*/, embedAndUpload(filePath, 'custom_upload')];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    console.log('All files processed.');
                    return [2 /*return*/];
            }
        });
    });
}
run();
