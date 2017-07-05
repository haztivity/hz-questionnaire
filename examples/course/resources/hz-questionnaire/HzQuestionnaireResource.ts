/**
 * @license
 * Copyright Davinchi. All Rights Reserved.
 */
import {
    $,
    Resource,
    ResourceController,
    EventEmitterFactory,
    ScormService,
    NavigatorService,
    DataOptions
} from "@haztivity/core";
import "jquery-ui-dist/jquery-ui";
import "jq-questionnaire";
@Resource(
    {
        name: "HzQuestionnaire",
        dependencies: [
            $,
            EventEmitterFactory,
            ScormService,
            NavigatorService,
            DataOptions
        ]
    }
)
export class HzQuestionnaireResource extends ResourceController {
    public static readonly NAMESPACE = "hzQuestionnaire";
    public static readonly ON_ANSWER = `${HzQuestionnaireResource.NAMESPACE}:answer`;
    public static readonly ON_START = `${HzQuestionnaireResource.NAMESPACE}:start`;
    public static readonly ON_STARTED = `${HzQuestionnaireResource.NAMESPACE}:started`;
    public static readonly ON_END = `${HzQuestionnaireResource.NAMESPACE}:end`;
    protected static readonly PREFIX = "hz-questionnaire";
    protected static readonly CLASS_COMPONENT = HzQuestionnaireResource.PREFIX;
    protected static readonly DEFAULT_QUESTIONNAIRE = {

    };
    protected static readonly _DEFAULTS = {
        locale: {
            "es": {
                next: "Siguiente",
                prev: "Anterior"
            }
        },
        defaultLang: "es"
    };
    protected _config:any;
    protected _instance:any;
    protected _id:any;
    protected _objectiveIndex;
    /**
     * Recurso de cuestionario. Encapsula jquery.questionnaire
     * @param _$
     * @param _EventEmitterFactory
     * @param _ScormService
     * @example
     * div(data-hz-component="HzHeader")
     *      h1(data-hz-header-title)
     */
    constructor(_$: JQueryStatic, _EventEmitterFactory,protected _ScormService:ScormService,protected _NavigatorService:NavigatorService, protected _DataOptions) {
        super(_$, _EventEmitterFactory);
    }

    init(options, config?) {
        this._options = options;
        this._config = config;
        let questionnaireOptions = this._DataOptions.getDataOptions(this._$element, "jqQuestionnaire");
        this._options.questionnaire = this._$.extend(true,{}, HzQuestionnaireResource.DEFAULT_QUESTIONNAIRE, questionnaireOptions);
        this._$element.jqQuestionnaire(questionnaireOptions);
        this._instance = this._$element.jqQuestionnaire("instance");
        this._id = this._instance.getId();
        this._initScorm();
        this._assignEvents();
    }
    protected _initScorm(){
        this._ScormService.doLMSInitialize();
        if(this._ScormService.LMSIsInitialized()){
            let objectiveIndex = this._findObjectiveIndex(this._id);
            if(objectiveIndex == -1){
                objectiveIndex = this._registerObjective();
            }
            this._objectiveIndex = objectiveIndex;
        }
    }
    protected _registerObjective(){
        let objectives = parseInt(this._ScormService.doLMSGetValue("cmi.objectives._count")),
            currentObjective = objectives;
        this._ScormService.doLMSSetValue(`cmi.objectives.${currentObjective}.id`,this._id);
        this._ScormService.doLMSSetValue(`cmi.objectives.${currentObjective}.status`,"not attempted");
        this._ScormService.doLMSSetValue(`cmi.objectives.${currentObjective}.score.max`,this._instance.getMaxPoints());
        this._ScormService.doLMSCommit();
        return currentObjective;
    }
    protected _findObjectiveIndex(id){
        let objectives = parseInt(this._ScormService.doLMSGetValue("cmi.objectives._count")),
            index = -1;
        for (let objectiveIndex = 0; objectiveIndex < objectives; objectiveIndex++) {
            let objective = "cmi.objectives."+objectiveIndex,
                objectiveId = this._ScormService.doLMSGetValue(objective+".id");
            //se busca el objetivo de la actividad actual
            if(objectiveId === id){
                index = objectiveIndex;
                objectiveIndex = objectives;
            }
        }
        return index;
    }
    protected _assignEvents(){
        this._$element.off(HzQuestionnaireResource.NAMESPACE)
            .on(this._instance.ON_OPTION_CHANGE+"."+HzQuestionnaireResource.NAMESPACE,{instance:this},this._onOptionChange)
            .on(this._instance.ON_END+"."+HzQuestionnaireResource.NAMESPACE,{instance:this},this._onEnd)
            .on(this._instance.ON_START+"."+HzQuestionnaireResource.NAMESPACE,{instance:this},this._onStart)
            .on(this._instance.ON_STARTED+"."+HzQuestionnaireResource.NAMESPACE,{instance:this},this._onStarted)
    }
    protected _onEnd(e,jqQuestionnaireInstance,calification){
        let instance = e.data.instance;
        if(instance._ScormService.LMSIsInitialized()){
            instance._ScormService.doLMSSetValue(`cmi.objectives.${instance._objectiveIndex}.score.raw`,calification.score);
            instance._ScormService.doLMSSetValue(`cmi.objectives.${instance._objectiveIndex}.status`,calification.success ? "passed" : "failed");
            instance._ScormService.doLMSCommit();
        }
        instance._score = calification;
        instance._NavigatorService.enable();
        instance._markAsCompleted();
        instance._eventEmitter.trigger(HzQuestionnaireResource.ON_END,[this,calification]);
        instance._eventEmitter.globalEmitter.trigger(HzQuestionnaireResource.ON_END,[this,calification]);
    }
    protected _onStart(e,jqQuestionnaireInstance){
        let instance = e.data.instance;
        instance._NavigatorService.disable();
        instance._eventEmitter.trigger(HzQuestionnaireResource.ON_START,[this]);
        instance._eventEmitter.globalEmitter.trigger(HzQuestionnaireResource.ON_START,[this]);
    }
    protected _onStarted(e,jqQuestionnaireInstance){
        let instance = e.data.instance;
        if(instance._ScormService.LMSIsInitialized()){
            instance._ScormService.doLMSSetValue(`cmi.objectives.${instance._objectiveIndex}.status`,"incomplete");
            instance._ScormService.doLMSCommit();
        }
        instance._eventEmitter.trigger(HzQuestionnaireResource.ON_STARTED,[this]);
        instance._eventEmitter.globalEmitter.trigger(HzQuestionnaireResource.ON_STARTED,[this]);
    }
    protected _onOptionChange(e,jqQuestionnaireInstance,questionId,optionId){
        let instance:HzQuestionnaireResource = e.data.instance;
        instance._eventEmitter.trigger(HzQuestionnaireResource.ON_ANSWER,[this,questionId,optionId]);
        instance._eventEmitter.globalEmitter.trigger(HzQuestionnaireResource.ON_ANSWER,[this,questionId,optionId]);
    }
    public disable(){
        if(super.disable()){
            this._$element.jqQuestionnaire("option","disabled",true);
        }
    }
    public enable(){
        if(super.enable()){
            this._$element.jqQuestionnaire("option","disabled",false);
        }
    }
    public getInstance(): any {
        return this._instance;
    }
}
