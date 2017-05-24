"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright Davinchi. All Rights Reserved.
 */
var core_1 = require("@haztivity/core");
require("jquery-ui-dist/jquery-ui");
require("./jqQuestionnaire/jquery.questionnaire");
var HzQuestionnaireResource = HzQuestionnaireResource_1 = (function (_super) {
    __extends(HzQuestionnaireResource, _super);
    /**
     * Recurso de cuestionario. Encapsula jquery.questionnaire
     * @param _$
     * @param _EventEmitterFactory
     * @param _ScormService
     * @example
     * div(data-hz-component="HzHeader")
     *      h1(data-hz-header-title)
     */
    function HzQuestionnaireResource(_$, _EventEmitterFactory, _ScormService, _NavigatorService) {
        var _this = _super.call(this, _$, _EventEmitterFactory) || this;
        _this._ScormService = _ScormService;
        _this._NavigatorService = _NavigatorService;
        return _this;
    }
    HzQuestionnaireResource.prototype.init = function (options, config) {
        this._options = options;
        this._config = config;
        this._$element.jqQuestionnaire(this._options);
        this._instance = this._$element.data("uiJqQuestionnaire");
        this._id = this._instance.getId();
        this._initScorm();
        this._assignEvents();
    };
    HzQuestionnaireResource.prototype._initScorm = function () {
        this._ScormService.doLMSInitialize();
        if (this._ScormService.LMSIsInitialized()) {
            var objectiveIndex = this._findObjectiveIndex(this._id);
            if (objectiveIndex == -1) {
                objectiveIndex = this._registerObjective();
            }
            this._objectiveIndex = objectiveIndex;
        }
    };
    HzQuestionnaireResource.prototype._registerObjective = function () {
        var objectives = parseInt(this._ScormService.doLMSGetValue("cmi.objectives._count")), currentObjective = objectives;
        this._ScormService.doLMSSetValue("cmi.objectives." + currentObjective + ".id", this._id);
        this._ScormService.doLMSSetValue("cmi.objectives." + currentObjective + ".status", "not attempted");
        this._ScormService.doLMSSetValue("cmi.objectives." + currentObjective + ".score.max", this._instance.getMaxPoints());
        this._ScormService.doLMSCommit();
        return currentObjective;
    };
    HzQuestionnaireResource.prototype._findObjectiveIndex = function (id) {
        var objectives = parseInt(this._ScormService.doLMSGetValue("cmi.objectives._count")), index = -1;
        for (var objectiveIndex = 0; objectiveIndex < objectives; objectiveIndex++) {
            var objective = "cmi.objectives." + objectiveIndex, objectiveId = this._ScormService.doLMSGetValue(objective + ".id");
            //se busca el objetivo de la actividad actual
            if (objectiveId === id) {
                index = objectiveIndex;
                objectiveIndex = objectives;
            }
        }
        return index;
    };
    HzQuestionnaireResource.prototype._assignEvents = function () {
        this._$element.off(HzQuestionnaireResource_1.NAMESPACE)
            .on(this._instance.ON_OPTION_CHANGE + "." + HzQuestionnaireResource_1.NAMESPACE, { instance: this }, this._onOptionChange)
            .on(this._instance.ON_END + "." + HzQuestionnaireResource_1.NAMESPACE, { instance: this }, this._onEnd)
            .on(this._instance.ON_START + "." + HzQuestionnaireResource_1.NAMESPACE, { instance: this }, this._onStart)
            .on(this._instance.ON_STARTED + "." + HzQuestionnaireResource_1.NAMESPACE, { instance: this }, this._onStarted);
    };
    HzQuestionnaireResource.prototype._onEnd = function (e, jqQuestionnaireInstance, calification) {
        var instance = e.data.instance;
        if (instance._ScormService.LMSIsInitialized()) {
            instance._ScormService.doLMSSetValue("cmi.objectives." + instance._objectiveIndex + ".score.raw", calification.points);
            instance._ScormService.doLMSSetValue("cmi.objectives." + instance._objectiveIndex + ".status", calification.success ? "passed" : "failed");
            instance._ScormService.doLMSCommit();
        }
        instance._NavigatorService.enable();
        instance._markAsCompleted();
        instance._eventEmitter.trigger(HzQuestionnaireResource_1.ON_END, [this, calification]);
        instance._eventEmitter.globalEmitter.trigger(HzQuestionnaireResource_1.ON_END, [this, calification]);
    };
    HzQuestionnaireResource.prototype._onStart = function (e, jqQuestionnaireInstance) {
        var instance = e.data.instance;
        instance._NavigatorService.disable();
        instance._eventEmitter.trigger(HzQuestionnaireResource_1.ON_START, [this]);
        instance._eventEmitter.globalEmitter.trigger(HzQuestionnaireResource_1.ON_START, [this]);
    };
    HzQuestionnaireResource.prototype._onStarted = function (e, jqQuestionnaireInstance) {
        var instance = e.data.instance;
        if (instance._ScormService.LMSIsInitialized()) {
            instance._ScormService.doLMSSetValue("cmi.objectives." + instance._objectiveIndex + ".status", "incomplete");
            instance._ScormService.doLMSCommit();
        }
        instance._eventEmitter.trigger(HzQuestionnaireResource_1.ON_STARTED, [this]);
        instance._eventEmitter.globalEmitter.trigger(HzQuestionnaireResource_1.ON_STARTED, [this]);
    };
    HzQuestionnaireResource.prototype._onOptionChange = function (e, jqQuestionnaireInstance, questionId, optionId) {
        var instance = e.data.instance;
        instance._eventEmitter.trigger(HzQuestionnaireResource_1.ON_ANSWER, [this, questionId, optionId]);
        instance._eventEmitter.globalEmitter.trigger(HzQuestionnaireResource_1.ON_ANSWER, [this, questionId, optionId]);
    };
    HzQuestionnaireResource.prototype.disable = function () {
        if (_super.prototype.disable.call(this)) {
            this._$element.jqQuestionnaire("option", "disabled", true);
        }
    };
    HzQuestionnaireResource.prototype.enable = function () {
        if (_super.prototype.enable.call(this)) {
            this._$element.jqQuestionnaire("option", "disabled", false);
        }
    };
    HzQuestionnaireResource.prototype.getInstance = function () {
        return this._instance;
    };
    return HzQuestionnaireResource;
}(core_1.ResourceController));
HzQuestionnaireResource.NAMESPACE = "hzQuestionnaire";
HzQuestionnaireResource.ON_ANSWER = HzQuestionnaireResource_1.NAMESPACE + ":answer";
HzQuestionnaireResource.ON_START = HzQuestionnaireResource_1.NAMESPACE + ":start";
HzQuestionnaireResource.ON_STARTED = HzQuestionnaireResource_1.NAMESPACE + ":started";
HzQuestionnaireResource.ON_END = HzQuestionnaireResource_1.NAMESPACE + ":end";
HzQuestionnaireResource.PREFIX = "hz-questionnaire";
HzQuestionnaireResource.CLASS_COMPONENT = HzQuestionnaireResource_1.PREFIX;
HzQuestionnaireResource._DEFAULTS = {
    locale: {
        "es": {
            next: "Siguiente",
            prev: "Anterior"
        }
    },
    defaultLang: "es"
};
HzQuestionnaireResource = HzQuestionnaireResource_1 = __decorate([
    core_1.Resource({
        name: "HzQuestionnaire",
        dependencies: [
            core_1.$,
            core_1.EventEmitterFactory,
            core_1.ScormService,
            core_1.NavigatorService
        ]
    })
], HzQuestionnaireResource);
exports.HzQuestionnaireResource = HzQuestionnaireResource;
var HzQuestionnaireResource_1;
//# sourceMappingURL=HzQuestionnaireResource.js.map