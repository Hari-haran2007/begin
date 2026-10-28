const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

let dbInstance = null;
let dbPathUsed = null;
const registeredModels = {};

/**
 * ObjectId representation compatible with MongoDB ObjectId
 */
class ObjectId {
  constructor(id) {
    if (id instanceof ObjectId) {
      this._id = id._id;
    } else if (typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)) {
      this._id = id.toLowerCase();
    } else if (id && typeof id.toString === 'function' && /^[0-9a-fA-F]{24}$/.test(id.toString())) {
      this._id = id.toString().toLowerCase();
    } else if (id != null) {
      this._id = String(id);
    } else {
      this._id = crypto.randomBytes(12).toString('hex');
    }
  }

  toString() {
    return this._id;
  }

  toHexString() {
    return this._id;
  }

  valueOf() {
    return this._id;
  }

  toJSON() {
    return this._id;
  }

  equals(other) {
    if (other == null) return false;
    const str = (other instanceof ObjectId || (other && typeof other.toString === 'function'))
      ? other.toString()
      : String(other);
    return this._id.toLowerCase() === str.toLowerCase();
  }

  static isValid(id) {
    if (!id) return false;
    if (id instanceof ObjectId) return true;
    if (typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)) return true;
    if (typeof id === 'object' && id._id && /^[0-9a-fA-F]{24}$/.test(id._id)) return true;
    return false;
  }
}

/**
 * Schema definition
 */
class Schema {
  constructor(definition = {}, options = {}) {
    this.definition = definition;
    this.options = options || {};
    this.virtuals = {};
    this.indexes = [];
  }

  virtual(name) {
    if (!this.virtuals[name]) {
      this.virtuals[name] = { getter: null, setter: null };
    }
    const self = this;
    return {
      get(fn) {
        self.virtuals[name].getter = fn;
        return this;
      },
      set(fn) {
        self.virtuals[name].setter = fn;
        return this;
      }
    };
  }

  index(fields, options) {
    this.indexes.push({ fields, options });
    return this;
  }
}

Schema.Types = {
  ObjectId: ObjectId,
  String: String,
  Number: Number,
  Boolean: Boolean,
  Date: Date,
  Array: Array,
  Mixed: Object
};

/**
 * Model table name resolution
 */
function getTableName(modelName) {
  const map = {
    'User': 'users',
    'Certification': 'certifications',
    'ComparisonData': 'comparisondatas',
    'Conversation': 'conversations',
    'DNAAssessment': 'dnaassessments',
    'GrowthMetrics': 'growthmetrics',
    'Hackathon': 'hackathons',
    'Internship': 'internships',
    'MeetingRequest': 'meetingrequests',
    'Message': 'messages',
    'Project': 'projects',
    'SemesterPerformance': 'semesterperformances',
    'Skill': 'skills',
    'StaffNotification': 'staffnotifications',
    'StudentNotification': 'studentnotifications',
    'Workshop': 'workshops'
  };
  if (map[modelName]) return map[modelName];
  const lower = modelName.toLowerCase();
  return lower.endsWith('s') ? lower : lower + 's';
}

/**
 * Ensure database is connected and initialized
 */
function getDb(customPath) {
  if (dbInstance) return dbInstance;

  const targetPath = customPath || process.env.SQLITE_DB_PATH || 'database.sqlite';
  const resolved = path.isAbsolute(targetPath) ? targetPath : path.resolve(__dirname, '..', targetPath);

  const dir = path.dirname(resolved);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  dbInstance = new DatabaseSync(resolved);
  dbPathUsed = resolved;

  // Optimize SQLite
  dbInstance.exec('PRAGMA journal_mode = WAL;');
  dbInstance.exec('PRAGMA synchronous = NORMAL;');
  dbInstance.exec('PRAGMA foreign_keys = ON;');

  // Meta table
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS _meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  return dbInstance;
}

/**
 * Auto-seed collection from backup directory if empty
 */
function autoSeedTableIfEmpty(db, tableName) {
  try {
    const row = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
    if (row && row.count > 0) return;

    // Search for backup directories
    const candidateDirs = [
      path.resolve(__dirname, '..', '..', 'db_backup'),
      path.resolve(__dirname, '..', 'db_backup'),
      path.resolve(process.cwd(), 'db_backup')
    ];

    let foundFile = null;
    for (const baseDir of candidateDirs) {
      if (!fs.existsSync(baseDir)) continue;
      const subEntries = fs.readdirSync(baseDir);
      for (const entry of subEntries) {
        const full = path.join(baseDir, entry);
        if (fs.statSync(full).isDirectory() && entry.startsWith('backup_')) {
          const jsonPath = path.join(full, `${tableName}.json`);
          if (fs.existsSync(jsonPath)) {
            foundFile = jsonPath;
            break;
          }
        }
      }
      if (foundFile) break;
    }

    if (foundFile) {
      const content = fs.readFileSync(foundFile, 'utf8');
      const records = JSON.parse(content);
      if (Array.isArray(records) && records.length > 0) {
        const insertStmt = db.prepare(`
          INSERT OR REPLACE INTO ${tableName} (id, data, created_at, updated_at) 
          VALUES (?, ?, ?, ?)
        `);
        for (const item of records) {
          const id = item._id ? (item._id.toString ? item._id.toString() : String(item._id)) : (new ObjectId()).toString();
          item._id = id;
          item.id = id;
          const createdAt = item.created_at || item.createdAt || new Date().toISOString();
          const updatedAt = item.updated_at || item.updatedAt || new Date().toISOString();
          insertStmt.run(id, JSON.stringify(item), createdAt, updatedAt);
        }
        console.log(`[SQLite] Auto-seeded ${records.length} records into table '${tableName}' from ${path.basename(foundFile)}`);
      }
    }
  } catch (err) {
    console.error(`[SQLite Seeding Warning for ${tableName}]:`, err.message);
  }
}

/**
 * Ensure table exists for a model
 */
function ensureTable(db, tableName) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${tableName} (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE INDEX IF NOT EXISTS ${tableName}_created_at_idx ON ${tableName} (created_at);
  `);
  autoSeedTableIfEmpty(db, tableName);
}

/**
 * Retrieve nested object property by string dot path
 */
function getPathValue(obj, dotPath) {
  if (obj == null || typeof obj !== 'object') return undefined;
  if (dotPath === 'id' || dotPath === '_id') return obj._id || obj.id;
  if (Object.prototype.hasOwnProperty.call(obj, dotPath) && obj[dotPath] !== undefined) {
    return obj[dotPath];
  }

  const parts = dotPath.split('.');
  let curr = obj;
  for (const p of parts) {
    if (curr == null) return undefined;
    curr = curr[p];
  }
  return curr;
}

/**
 * Set nested object property by string dot path
 */
function setPathValue(obj, dotPath, value) {
  if (!dotPath || obj == null) return;
  const parts = dotPath.split('.');
  let curr = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (curr[p] == null || typeof curr[p] !== 'object') {
      curr[p] = {};
    }
    curr = curr[p];
  }
  curr[parts[parts.length - 1]] = value;
}

/**
 * Evaluate single condition on a field value
 */
function matchesCondition(actual, expected) {
  if (expected instanceof ObjectId) {
    expected = expected.toString();
  }
  if (actual instanceof ObjectId) {
    actual = actual.toString();
  }

  if (expected instanceof RegExp) {
    return expected.test(actual == null ? '' : String(actual));
  }

  // Operator object
  if (expected && typeof expected === 'object' && !Array.isArray(expected) && !(expected instanceof Date)) {
    for (const op of Object.keys(expected)) {
      const target = expected[op];
      if (op === '$in') {
        const targetList = target.map(t => (t instanceof ObjectId || (t && t.toString)) ? t.toString() : String(t));
        const actualStr = (actual instanceof ObjectId || (actual && actual.toString)) ? actual.toString() : String(actual);
        if (Array.isArray(actual)) {
          if (!actual.some(item => targetList.includes(item?.toString ? item.toString() : String(item)))) return false;
        } else {
          if (!targetList.includes(actualStr)) return false;
        }
      } else if (op === '$nin') {
        const targetList = target.map(t => (t instanceof ObjectId || (t && t.toString)) ? t.toString() : String(t));
        const actualStr = (actual instanceof ObjectId || (actual && actual.toString)) ? actual.toString() : String(actual);
        if (targetList.includes(actualStr)) return false;
      } else if (op === '$ne') {
        const targetStr = (target instanceof ObjectId || (target && target.toString)) ? target.toString() : String(target);
        const actualStr = (actual instanceof ObjectId || (actual && actual.toString)) ? actual.toString() : String(actual);
        if (actual == null && target == null) return false;
        if (actualStr === targetStr) return false;
      } else if (op === '$exists') {
        const exists = actual !== undefined && actual !== null;
        if (target === false && exists) return false;
        if (target === true && !exists) return false;
      } else if (op === '$gte') {
        if (Number(actual) < Number(target)) return false;
      } else if (op === '$gt') {
        if (Number(actual) <= Number(target)) return false;
      } else if (op === '$lte') {
        if (Number(actual) > Number(target)) return false;
      } else if (op === '$lt') {
        if (Number(actual) >= Number(target)) return false;
      } else if (op === '$regex') {
        const re = new RegExp(target, expected.$options || '');
        if (!re.test(actual == null ? '' : String(actual))) return false;
      }
    }
    return true;
  }

  // Primitive equality
  if (actual === expected) return true;
  if (actual == null && expected == null) return true;
  if (actual == null || expected == null) return false;

  const aStr = (actual instanceof ObjectId || typeof actual?.toString === 'function') ? actual.toString() : String(actual);
  const eStr = (expected instanceof ObjectId || typeof expected?.toString === 'function') ? expected.toString() : String(expected);
  if (aStr === eStr) return true;

  if (Array.isArray(actual)) {
    return actual.some(item => {
      const iStr = (item instanceof ObjectId || typeof item?.toString === 'function') ? item.toString() : String(item);
      return iStr === eStr;
    });
  }

  return false;
}

/**
 * Filter evaluation against MongoDB query filter
 */
function matchesFilter(doc, filter) {
  if (!filter || Object.keys(filter).length === 0) return true;

  for (const key of Object.keys(filter)) {
    if (key === '$or') {
      const orList = filter.$or;
      if (!Array.isArray(orList) || !orList.some(sub => matchesFilter(doc, sub))) {
        return false;
      }
    } else if (key === '$and') {
      const andList = filter.$and;
      if (!Array.isArray(andList) || !andList.every(sub => matchesFilter(doc, sub))) {
        return false;
      }
    } else if (key === '$nor') {
      const norList = filter.$nor;
      if (!Array.isArray(norList) || norList.some(sub => matchesFilter(doc, sub))) {
        return false;
      }
    } else {
      const val = getPathValue(doc, key);
      const cond = filter[key];
      if (!matchesCondition(val, cond)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Sort results
 */
function applySort(items, sortArg) {
  if (!sortArg) return items;
  let sortRules = [];
  if (typeof sortArg === 'string') {
    sortRules = sortArg.trim().split(/\s+/).map(field => {
      if (field.startsWith('-')) {
        return { field: field.substring(1), dir: -1 };
      }
      return { field, dir: 1 };
    });
  } else if (typeof sortArg === 'object') {
    sortRules = Object.entries(sortArg).map(([field, dir]) => ({
      field,
      dir: (dir === -1 || dir === 'desc' || dir === 'descending') ? -1 : 1
    }));
  }

  return items.sort((a, b) => {
    for (const rule of sortRules) {
      let valA = getPathValue(a, rule.field);
      let valB = getPathValue(b, rule.field);

      if (typeof valA === 'string' && /^\d{4}-\d{2}-\d{2}/.test(valA)) {
        valA = new Date(valA).getTime();
      }
      if (typeof valB === 'string' && /^\d{4}-\d{2}-\d{2}/.test(valB)) {
        valB = new Date(valB).getTime();
      }

      if (valA === valB) continue;
      if (valA == null) return 1 * rule.dir;
      if (valB == null) return -1 * rule.dir;
      if (valA > valB) return 1 * rule.dir;
      if (valA < valB) return -1 * rule.dir;
    }
    return 0;
  });
}

/**
 * Project fields
 */
function applySelect(doc, selectArg) {
  if (!selectArg || !doc) return doc;
  const fields = typeof selectArg === 'string' ? selectArg.trim().split(/\s+/) : selectArg;
  if (!Array.isArray(fields) || fields.length === 0) return doc;

  const isExclusion = fields.some(f => f.startsWith('-'));
  const res = { ...doc };

  if (isExclusion) {
    for (const f of fields) {
      if (f.startsWith('-')) {
        delete res[f.substring(1)];
      }
    }
  } else {
    const included = new Set(fields);
    included.add('_id');
    included.add('id');
    for (const key of Object.keys(res)) {
      if (!included.has(key)) {
        delete res[key];
      }
    }
  }
  return res;
}

/**
 * Populate references
 */
async function applyPopulate(doc, populateList, models) {
  if (!doc) return doc;
  for (const pop of populateList) {
    const pathName = pop.path;
    const select = pop.select;
    const refVal = doc[pathName];
    if (!refVal) continue;

    const refId = (refVal instanceof ObjectId || typeof refVal.toString === 'function') 
      ? refVal.toString() 
      : String(refVal);

    // Look up target model
    let targetModelName = pop.model;
    if (!targetModelName) {
      // derive target model from field name or registered models
      if (pathName === 'studentId' || pathName === 'staffId' || pathName === 'user_id' || pathName === 'senderId' || pathName === 'receiverId') {
        targetModelName = 'User';
      }
    }

    const TargetModel = models[targetModelName] || models['User'];
    if (TargetModel) {
      let refDoc = await TargetModel.findById(refId).lean();
      if (refDoc && select) {
        refDoc = applySelect(refDoc, select);
      }
      doc[pathName] = refDoc || null;
    }
  }
  return doc;
}

/**
 * Apply update operations ($set, $inc, direct keys)
 */
function applyUpdate(doc, update) {
  if (!update || typeof update !== 'object') return doc;

  if (update.$set) {
    for (const [k, v] of Object.entries(update.$set)) {
      setPathValue(doc, k, v);
    }
  }
  if (update.$inc) {
    for (const [k, v] of Object.entries(update.$inc)) {
      const current = Number(getPathValue(doc, k)) || 0;
      setPathValue(doc, k, current + Number(v));
    }
  }
  if (update.$unset) {
    for (const k of Object.keys(update.$unset)) {
      delete doc[k];
    }
  }

  for (const [k, v] of Object.entries(update)) {
    if (!k.startsWith('$')) {
      setPathValue(doc, k, v);
    }
  }

  return doc;
}

/**
 * Aggregation Pipeline execution
 */
async function executeAggregate(pipeline, tableName, schema, model) {
  const db = getDb();
  ensureTable(db, tableName);
  const rows = db.prepare(`SELECT data FROM ${tableName}`).all();
  let items = rows.map(r => JSON.parse(r.data));

  for (const stage of pipeline) {
    const stageName = Object.keys(stage)[0];
    const stageVal = stage[stageName];

    if (stageName === '$match') {
      items = items.filter(item => matchesFilter(item, stageVal));
    } else if (stageName === '$sort') {
      items = applySort(items, stageVal);
    } else if (stageName === '$limit') {
      items = items.slice(0, stageVal);
    } else if (stageName === '$skip') {
      items = items.slice(stageVal);
    } else if (stageName === '$group') {
      const groups = new Map();
      const idExpr = stageVal._id;

      for (const item of items) {
        let groupKey;
        if (idExpr === null) {
          groupKey = '__null__';
        } else if (typeof idExpr === 'string' && idExpr.startsWith('$')) {
          groupKey = getPathValue(item, idExpr.substring(1));
        } else {
          groupKey = idExpr;
        }

        if (!groups.has(groupKey)) {
          groups.set(groupKey, {
            _id: groupKey === '__null__' ? null : groupKey,
            _items: []
          });
        }
        groups.get(groupKey)._items.push(item);
      }

      const result = [];
      for (const groupObj of groups.values()) {
        const out = { _id: groupObj._id };
        for (const [field, acc] of Object.entries(stageVal)) {
          if (field === '_id') continue;
          const accOp = Object.keys(acc)[0];
          const accExpr = acc[accOp];

          if (accOp === '$sum') {
            if (typeof accExpr === 'number') {
              out[field] = groupObj._items.length * accExpr;
            } else if (typeof accExpr === 'string' && accExpr.startsWith('$')) {
              const f = accExpr.substring(1);
              out[field] = groupObj._items.reduce((s, it) => s + (Number(getPathValue(it, f)) || 0), 0);
            }
          } else if (accOp === '$avg') {
            if (typeof accExpr === 'string' && accExpr.startsWith('$')) {
              const f = accExpr.substring(1);
              let sum = 0, count = 0;
              for (const it of groupObj._items) {
                const val = Number(getPathValue(it, f));
                if (!isNaN(val)) {
                  sum += val;
                  count++;
                }
              }
              out[field] = count > 0 ? (sum / count) : 0;
            }
          } else if (accOp === '$push') {
            if (typeof accExpr === 'string' && accExpr.startsWith('$')) {
              const f = accExpr.substring(1);
              out[field] = groupObj._items.map(it => getPathValue(it, f));
            } else {
              out[field] = groupObj._items.map(() => accExpr);
            }
          }
        }
        result.push(out);
      }
      items = result;
    }
  }

  return items;
}

/**
 * Create a Model Document with virtuals and save() method
 */
function createDocument(data, schema, model) {
  const raw = { ...data };
  if (!raw._id) {
    raw._id = (new ObjectId()).toString();
  } else if (raw._id instanceof ObjectId) {
    raw._id = raw._id.toString();
  } else {
    raw._id = String(raw._id);
  }
  raw.id = raw._id;

  const doc = Object.create(model.prototype);
  Object.assign(doc, raw);

  // Set non-enumerable schema and model references
  Object.defineProperty(doc, '_schema', { value: schema, writable: true, enumerable: false });
  Object.defineProperty(doc, '_model', { value: model, writable: true, enumerable: false });
  Object.defineProperty(doc, '_tableName', { value: model._tableName, writable: true, enumerable: false });

  // Attach virtual getters
  if (schema && schema.virtuals) {
    for (const [virtName, virtDef] of Object.entries(schema.virtuals)) {
      if (virtDef.getter) {
        Object.defineProperty(doc, virtName, {
          get() {
            return virtDef.getter.call(this);
          },
          enumerable: true,
          configurable: true
        });
      }
    }
  }

  return doc;
}

/**
 * Query Builder for chained operations (.find().select().sort().lean())
 */
class Query {
  constructor(model, filter, options = {}) {
    this._model = model;
    this._filter = filter || {};
    this._options = options;
    this._selectFields = null;
    this._sortArgs = null;
    this._limitCount = null;
    this._skipCount = null;
    this._isLean = false;
    this._populates = [];
  }

  select(arg) {
    this._selectFields = arg;
    return this;
  }

  sort(arg) {
    this._sortArgs = arg;
    return this;
  }

  limit(n) {
    this._limitCount = Number(n);
    return this;
  }

  skip(n) {
    this._skipCount = Number(n);
    return this;
  }

  lean() {
    this._isLean = true;
    return this;
  }

  populate(pathOrObj, select) {
    if (typeof pathOrObj === 'object') {
      this._populates.push(pathOrObj);
    } else {
      this._populates.push({ path: pathOrObj, select });
    }
    return this;
  }

  async exec() {
    const db = getDb();
    ensureTable(db, this._model._tableName);
    const rows = db.prepare(`SELECT data FROM ${this._model._tableName}`).all();
    let docs = rows.map(r => JSON.parse(r.data));

    // Filter
    docs = docs.filter(doc => matchesFilter(doc, this._filter));

    // Sort
    if (this._sortArgs) {
      docs = applySort(docs, this._sortArgs);
    }

    // Skip
    if (this._skipCount != null && this._skipCount > 0) {
      docs = docs.slice(this._skipCount);
    }

    // Limit
    if (this._limitCount != null && this._limitCount >= 0) {
      docs = docs.slice(0, this._limitCount);
    }

    // Single result
    if (this._options.single) {
      if (docs.length === 0) return null;
      let raw = docs[0];
      if (this._populates.length > 0) {
        raw = await applyPopulate(raw, this._populates, registeredModels);
      }
      if (this._selectFields) {
        raw = applySelect(raw, this._selectFields);
      }
      if (this._isLean) {
        // Also attach virtuals on lean objects if schema has them
        if (this._model._schema?.virtuals) {
          const temp = createDocument(raw, this._model._schema, this._model);
          return temp.toObject({ virtuals: true });
        }
        return raw;
      }
      return createDocument(raw, this._model._schema, this._model);
    }

    // Multiple results
    const results = [];
    for (let raw of docs) {
      if (this._populates.length > 0) {
        raw = await applyPopulate(raw, this._populates, registeredModels);
      }
      if (this._selectFields) {
        raw = applySelect(raw, this._selectFields);
      }
      if (this._isLean) {
        if (this._model._schema?.virtuals) {
          const temp = createDocument(raw, this._model._schema, this._model);
          results.push(temp.toObject({ virtuals: true }));
        } else {
          results.push(raw);
        }
      } else {
        results.push(createDocument(raw, this._model._schema, this._model));
      }
    }

    return results;
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }
}

/**
 * Model factory
 */
function createModel(name, schema) {
  const tableName = getTableName(name);

  function ModelConstructor(data = {}) {
    return createDocument(data, schema, ModelConstructor);
  }

  ModelConstructor.modelName = name;
  ModelConstructor._schema = schema;
  ModelConstructor.schema = schema;
  ModelConstructor._tableName = tableName;

  // Document methods on prototype
  ModelConstructor.prototype.save = async function() {
    const now = new Date().toISOString();
    if (this._schema && this._schema.options && this._schema.options.timestamps) {
      const ts = this._schema.options.timestamps;
      const createdField = (typeof ts === 'object' && ts.createdAt) ? ts.createdAt : 'created_at';
      const updatedField = (typeof ts === 'object' && ts.updatedAt) ? ts.updatedAt : 'updated_at';
      if (!this[createdField]) this[createdField] = now;
      this[updatedField] = now;
    }

    const obj = this.toObject({ virtuals: false });
    const db = getDb();
    ensureTable(db, this._tableName);
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO ${this._tableName} (id, data, created_at, updated_at) 
      VALUES (?, ?, ?, ?)
    `);
    const id = String(this._id || this.id);
    stmt.run(id, JSON.stringify(obj), this.created_at || now, this.updated_at || now);
    return this;
  };

  ModelConstructor.prototype.toObject = function(opts = {}) {
    const plain = {};
    for (const [k, v] of Object.entries(this)) {
      if (k.startsWith('_') && k !== '_id' && k !== '__v') continue;
      plain[k] = v;
    }
    plain._id = this._id;
    plain.id = this._id;

    const includeVirtuals = opts.virtuals ?? (
      this._schema?.options?.toJSON?.virtuals || 
      this._schema?.options?.toObject?.virtuals ||
      true
    );

    if (includeVirtuals && this._schema?.virtuals) {
      for (const [vName, vDef] of Object.entries(this._schema.virtuals)) {
        if (vDef.getter) {
          try {
            plain[vName] = vDef.getter.call(this);
          } catch (e) {}
        }
      }
    }
    return plain;
  };

  ModelConstructor.prototype.toJSON = function(opts = {}) {
    return this.toObject({ virtuals: true, ...opts });
  };

  ModelConstructor.prototype.isModified = function() {
    return true;
  };

  ModelConstructor.prototype.populate = async function(pathOrObj, select) {
    const popList = typeof pathOrObj === 'object' ? [pathOrObj] : [{ path: pathOrObj, select }];
    await applyPopulate(this, popList, registeredModels);
    return this;
  };

  // Static methods
  ModelConstructor.find = function(filter) {
    return new Query(ModelConstructor, filter);
  };

  ModelConstructor.findOne = function(filter) {
    return new Query(ModelConstructor, filter, { single: true });
  };

  ModelConstructor.findById = function(id) {
    return new Query(ModelConstructor, { _id: id }, { single: true });
  };

  ModelConstructor.findByIdAndUpdate = async function(id, update, options = {}) {
    const doc = await ModelConstructor.findById(id);
    if (!doc) return null;
    const original = doc.toObject();
    applyUpdate(doc, update);
    await doc.save();
    return (options.new || options.returnDocument === 'after') ? doc : createDocument(original, schema, ModelConstructor);
  };

  ModelConstructor.findOneAndUpdate = async function(filter, update, options = {}) {
    const doc = await ModelConstructor.findOne(filter);
    if (!doc) return null;
    const original = doc.toObject();
    applyUpdate(doc, update);
    await doc.save();
    return (options.new || options.returnDocument === 'after') ? doc : createDocument(original, schema, ModelConstructor);
  };

  ModelConstructor.findByIdAndDelete = async function(id) {
    const doc = await ModelConstructor.findById(id);
    if (!doc) return null;
    const db = getDb();
    ensureTable(db, tableName);
    db.prepare(`DELETE FROM ${tableName} WHERE id = ?`).run(String(doc._id));
    return doc;
  };

  ModelConstructor.findByIdAndRemove = ModelConstructor.findByIdAndDelete;

  ModelConstructor.findOneAndDelete = async function(filter) {
    const doc = await ModelConstructor.findOne(filter);
    if (!doc) return null;
    const db = getDb();
    ensureTable(db, tableName);
    db.prepare(`DELETE FROM ${tableName} WHERE id = ?`).run(String(doc._id));
    return doc;
  };

  ModelConstructor.deleteOne = async function(filter) {
    const doc = await ModelConstructor.findOne(filter);
    if (!doc) return { acknowledged: true, deletedCount: 0 };
    const db = getDb();
    ensureTable(db, tableName);
    db.prepare(`DELETE FROM ${tableName} WHERE id = ?`).run(String(doc._id));
    return { acknowledged: true, deletedCount: 1 };
  };

  ModelConstructor.deleteMany = async function(filter = {}) {
    const docs = await ModelConstructor.find(filter);
    const db = getDb();
    ensureTable(db, tableName);
    const stmt = db.prepare(`DELETE FROM ${tableName} WHERE id = ?`);
    for (const d of docs) {
      stmt.run(String(d._id));
    }
    return { acknowledged: true, deletedCount: docs.length };
  };

  ModelConstructor.countDocuments = async function(filter = {}) {
    const docs = await ModelConstructor.find(filter);
    return docs.length;
  };

  ModelConstructor.distinct = async function(field, filter = {}) {
    const docs = await ModelConstructor.find(filter);
    const set = new Set();
    for (const d of docs) {
      const val = getPathValue(d, field);
      if (val !== undefined && val !== null) {
        set.add(val);
      }
    }
    return Array.from(set);
  };

  ModelConstructor.create = async function(data) {
    if (Array.isArray(data)) {
      const res = [];
      for (const item of data) {
        const doc = new ModelConstructor(item);
        await doc.save();
        res.push(doc);
      }
      return res;
    } else {
      const doc = new ModelConstructor(data);
      await doc.save();
      return doc;
    }
  };

  ModelConstructor.insertMany = async function(items) {
    return ModelConstructor.create(items);
  };

  ModelConstructor.aggregate = function(pipeline) {
    return executeAggregate(pipeline, tableName, schema, ModelConstructor);
  };

  const db = getDb();
  ensureTable(db, tableName);

  registeredModels[name] = ModelConstructor;
  return ModelConstructor;
}

/**
 * Main Mongoose-compatible interface
 */
const mongooseCompat = {
  Schema,
  Types: {
    ObjectId
  },
  model(name, schema) {
    if (!schema && registeredModels[name]) {
      return registeredModels[name];
    }
    return createModel(name, schema);
  },
  models: registeredModels,
  connect(uriOrPath, options) {
    return new Promise((resolve) => {
      const isMongo = typeof uriOrPath === 'string' && uriOrPath.startsWith('mongodb');
      const target = (!uriOrPath || isMongo) ? (process.env.SQLITE_DB_PATH || path.join(__dirname, '..', 'database.sqlite')) : uriOrPath;
      const db = getDb(target);
      console.log(`[SQLite] Connected successfully to SQLite database: ${dbPathUsed}`);
      resolve(mongooseCompat);
    });
  },
  disconnect() {
    return new Promise((resolve) => {
      if (dbInstance) {
        try {
          dbInstance.close();
        } catch (e) {}
        dbInstance = null;
      }
      resolve();
    });
  },
  connection: {
    get readyState() {
      return dbInstance ? 1 : 0;
    },
    on(event, fn) {},
    once(event, fn) {
      if (event === 'open') {
        setTimeout(fn, 0);
      }
    },
    close() {
      return mongooseCompat.disconnect();
    }
  }
};

module.exports = mongooseCompat;
