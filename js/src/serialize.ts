import * as widgets from "@jupyter-widgets/base";
import { isArray, isNumber } from "lodash";
import ndarray from "ndarray";
import * as THREE from "three";
import * as utils from "./utils";

function ascii_decode(buf) {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
}

function read_uint16_LE(buffer) {
    const view = new DataView(buffer);
    let val = view.getUint8(0);
    // tslint:disable-next-line: no-bitwise
    val |= view.getUint8(1) << 8;
    return val;
}

function numpy_buffer_to_ndarray(buf) {
    const magic = ascii_decode(buf.slice(0, 6));
    if (magic.slice(1, 6) !== "NUMPY") {
        throw new Error("unknown file type");
    }

    const version = new Uint8Array(buf.slice(6, 8));
    const headerLength = read_uint16_LE(buf.slice(8, 10));
    const headerStr = ascii_decode(buf.slice(10, 10 + headerLength));
    const offsetBytes = 10 + headerLength;
    // rest = buf.slice(10+headerLength);  XXX -- This makes a copy!!! https://www.khronos.org/registry/typedarray/specs/latest/#5

    const info = JSON.parse(headerStr.toLowerCase().replace("(", "[").replace(",),", "]").replace("),", "]").replace(/'/g, "\""));

    // Intepret the bytes according to the specified dtype
    let data;
    if (info.descr === "|u1") {
        data = new Uint8Array(buf, offsetBytes);
    } else if (info.descr === "|i1") {
        data = new Int8Array(buf, offsetBytes);
    } else if (info.descr === "<u2") {
        data = new Uint16Array(buf, offsetBytes);
    } else if (info.descr === "<i2") {
        data = new Int16Array(buf, offsetBytes);
    } else if (info.descr === "<u4") {
        data = new Uint32Array(buf, offsetBytes);
    } else if (info.descr === "<i4") {
        data = new Int32Array(buf, offsetBytes);
    } else if (info.descr === "<f4") {
        data = new Float32Array(buf, offsetBytes);
    } else if (info.descr === "<f8") {
        data = new Float64Array(buf, offsetBytes);
    } else {
        throw new Error("unknown numeric dtype");
    }

    return ndarray(data, info.shape);

}

// see https://github.com/jovyan/pythreejs/pull/80/files
// should go to a seperate package/module
const typesToArray = {
    int8: Int8Array,
    int16: Int16Array,
    int32: Int32Array,
    uint8: Uint8Array,
    uint16: Uint16Array,
    uint32: Uint32Array,
    float32: Float32Array,
    float64: Float64Array,
};

const arrayToTypes = {
    Int8Array: "int8",
    Int16Array: "int16",
    Int32Array: "int32",
    Uint8Array: "uint8",
    Uint16Array: "uint16",
    Uint32Array: "uint32",
    Float32Array: "float32",
    Float64Array: "float64",
};

function deserialize_typed_array(data, manager) {
    const type = typesToArray[data.dtype];
    if (data == null) {
        console.log("data is null");
    }
    if (!data.data) {
        console.log("data.data is null");
    }
    if (!data.data.buffer) {
        console.log("data.data.buffer is null");
    }
    return new type(data.data.buffer); //

}

export
function deserialize_array_or_json(data, manager) {
    if (data == null) {
        return null;
    }
    let arrays = null;
    if (isNumber(data)) { // plain number
        return data;
    } else { // should be an array of buffer+dtype+shape
        arrays = data.map((element) => deserialize_typed_array(element, manager));
    }
    arrays.original_data = data;
    return arrays;
    /*
    if(_.isArray(data) && !data.buffer) { // plain json, or list of buffers
        if(data.length == 0) {
            arrays = []
        } else
        if(!data[0].buffer) {
            // plain json
            if(_.isArray(data[0])) {
                arrays = _.map(data, function(array1d) { return new Float32Array(array1d)})
            } else {
                arrays = [new Float32Array(data)]
            }
        } else {
            arrays = _.map(data, function(data) { return new Float32Array(data.buffer)});
        }
    } else {
        nd = numpy_buffer_to_ndarray(data.buffer)
        if (nd.shape.length == 2) {
            arrays = []
            for(var i = 0; i < nd.shape[0]; i++) {
                var ar = nd.data.slice(i*nd.stride[0], (i+1)*nd.stride[0])
                arrays.push(ar)
            }
        } else { // assume 1d... ?
            arrays = [nd.data];
        }
    }
    arrays.original_data = data;
    return arrays;*/
}

export
function deserialize_color_or_json(data, manager) {
    if (data == null) {
        return null;
    }
    let arrays = null;

    // It can deals with these 6 cases: which are threated in the same order
    // shape is 0 dim, and it's a string, interpret as color
    // shape is 1 dim, items are strings, seperate color for each item
    // shape is 2 dim, items are strings, sequence of the above
    // shape is 1 dim, items are floats, it should be of length 3 -> rgb values
    // shape is 2 dim, items are float, it should be of shape (len(x), 3) -> rgb values
    // shape is 3 dim, items are float, it should be (sequence_length, len(x), 3) -> rgb values
    function string_array_to_rgb(string_array) {
        const rgbs = new Float32Array(string_array.length * 3);
        for (let i = 0; i < string_array.length; i++) {
            const color = new THREE.Color(string_array[i]);
            rgbs[i * 3 + 0] = color.r;
            rgbs[i * 3 + 1] = color.g;
            rgbs[i * 3 + 2] = color.b;
        }
        return rgbs;
    }
    function rgb_array_to_rgb(rgb_array) {
        const rgbs = new Float32Array(rgb_array.length * 3);
        for (let i = 0; i < rgb_array.length; i++) {
            rgbs[i * 3 + 0] = rgb_array[i][0];
            rgbs[i * 3 + 1] = rgb_array[i][1];
            rgbs[i * 3 + 2] = rgb_array[i][2];
        }
        return rgbs;
    }

    if (typeof data === "string") { // single color
        // var color = new THREE.Color(data)
        // arrays = new Float32Array([color.r, color.g, color.b]) // no sequence, scalar
        return data; // special case, if we keep it a string, we can control it via colorppicker
    } else {
        if (typeof data.dtype !== "undefined") { // we have a list of ndarrays
            arrays = [deserialize_typed_array(data, manager)];
        } else if (typeof data[0].dtype !== "undefined") { // we have a list of ndarrays
            arrays = data.map((element) => deserialize_typed_array(element, manager));
        } else {
            const dimension = utils.get_array_dimension(data);
            // must be a plain list of string, or list of list
            if (dimension === 1 && typeof data[0] === "string") {
                arrays = string_array_to_rgb(data);
            } else
                if (dimension === 2 && typeof data[0][0] === "string") {
                    arrays = data.map(string_array_to_rgb);
                } else {
                    console.error("don't understand color type");
                }
        }
    }
    arrays.original_data = data;
    return arrays;
}

export
function serialize_array_or_json(obj, manager) {
    if (isNumber(obj)) { return obj; } // return numbers directly
    if (obj != null) {
        if (typeof obj.original_data === "undefined") { // if someone modified the data from javascript land, we don't have this
            return obj;
        } else {
            return obj.original_data;
        } // ftm we just feed back the original data, we don't modify currently
    } else {
        return null;
    }
}
function deserialize_texture(data, manager) {
    if (typeof data === "string") {
        if (data.startsWith("IPY_MODEL_")) {
            return widgets.unpack_models(data, manager);
        }
    }
    return data;
}
function deserialize_ndarray(data, manager) {
    if (data === null) {
        return null;
    }
    return ndarray(deserialize_typed_array(data, manager), data.shape);
}

function serialize_ndarray(data, manager) {
    if (data === null) {
        return null;
    }
    let ar = data;
    if (isArray(data) && !(data as any).data) { // plain list of list
        ar = require("ndarray-pack")(data);
    }
    const data_json = { data: ar.data.buffer, dtype: arrayToTypes[ar.data.constructor.name], shape: ar.shape };
    return data_json;
}

function serialize_texture(data, manager) {
    return data;
}

// (window as any).ndarray = ndarray;

export const texture = { deserialize: deserialize_texture, serialize: serialize_texture };
// export const serialize_array_or_json = serialize_array_or_json;
// export const deserialize_array_or_json = deserialize_array_or_json;
// export const deserialize_color_or_json = deserialize_color_or_json;
export const array_or_json = { deserialize: deserialize_array_or_json, serialize: serialize_array_or_json };
export const color_or_json = { deserialize: deserialize_color_or_json, serialize: serialize_array_or_json };
const _ndarray = {deserialize: deserialize_ndarray, serialize: serialize_ndarray };
export {_ndarray as ndarray};
