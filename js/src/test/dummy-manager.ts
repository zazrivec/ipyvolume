import * as base from "@jupyter-widgets/base";
import * as widgets from "@jupyter-widgets/controls";
import * as services from "@jupyterlab/services";
import * as Backbone from "backbone";
import * as sinon from "sinon";

let numComms = 0;

export
class MockComm {
    comm_id: string;
    target_name: string;
    // tslint:disable-next-line: ban-types
    _on_msg: Function = null;
    // tslint:disable-next-line: ban-types
    _on_open: Function = null;
    // tslint:disable-next-line: ban-types
    _on_close: Function = null;
    constructor() {
        this.comm_id = `mock-comm-id-${numComms}`;
        numComms += 1;
    }
    on_open(fn) {
        this._on_open = fn;
    }
    on_close(fn) {
        this._on_close = fn;
    }
    on_msg(fn) {
        this._on_msg = fn;
    }
    _process_msg(msg) {
        if (this._on_msg) {
            return this._on_msg(msg);
        } else {
            return Promise.resolve();
        }
    }
    open() {
        if (this._on_open) {
            this._on_open();
        }
        return "";
    }
    close() {
        if (this._on_close) {
            this._on_close();
        }
        return "";
    }
    send() {
        return "";
    }
}

export
class DummyManager extends base.ManagerBase<HTMLElement> {

    el: HTMLElement;
    library: any;
    constructor(library: any) {
        super();
        this.el = window.document.createElement("div");
        window.document.body.appendChild(this.el);
        this.library = library;
    }

    display_view(msg: services.KernelMessage.IMessage, view: base.DOMWidgetView, options: any) {
        this.el.appendChild(view.el);
        view.on("remove", () => console.log("view removed", view));
        ( window as any).last_view = view;
        view.trigger("displayed");
        return Promise.resolve(view.el);
    }

    _get_comm_info() {
        return Promise.resolve({});
    }

    _create_comm() {
        return Promise.resolve(new MockComm());
    }

    protected loadClass(className: string, moduleName: string, moduleVersion: string): Promise<any> {
        if (moduleName === "@jupyter-widgets/base") {
            if (base[className]) {
                return Promise.resolve(base[className]);
            } else {
                return Promise.reject(`Cannot find class ${className}`);
            }
        } else if (moduleName === "@jupyter-widgets/controls") {
            if (widgets[className]) {
                return Promise.resolve(widgets[className]);
            } else {
                return Promise.reject(`Cannot find class ${className}`);
            }
        } else if (moduleName in this.library) {
            return Promise.resolve(this.library[moduleName][className]);
        } else {
            return Promise.reject(`Cannot find module ${moduleName}`);
        }
    }
}
