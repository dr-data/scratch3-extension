import bindAll from 'lodash.bindall';
import LocalizedStrings from 'react-localization';
import { Alert, Row, Col, Button, Layout, Icon, Menu , Divider, Table, Radio, Popconfirm, Input, Modal, Upload } from 'antd';
import React, { Component } from 'react';
import Blockly from 'scratch-blocks';

import { SketchPicker } from 'react-color';
import logo from './logo.svg';
import './App.css';
import { string } from 'postcss-selector-parser';

const { SubMenu } = Menu;
const { Header, Content, Footer, Sider } = Layout;
const RadioGroup = Radio.Group;

let strings = new LocalizedStrings({
  en:{
    extID: "Extension ID",
    extName: "Extension Name",
    preview: "Generate Preview",
    extdef: "Extension Define",
    extimg: "Extension Image",
    maincolor: "Extension Color",
    secondcolor: "Parameter Color",
    menuIcon: "Menu Icon",
    blockIcon: "Block Icon",
    addLabel: "Add Label",
    addInput: "Add String Parameter",
    addInputNum: "Add Number Parameter",
    addBool: "Add Boolean Parameter",
    addblock: "Add Blocks",
    addBlockFun: "Add Functional Block",
    addBlockOutput: "Add Output Block",
    addBlockBool: "Add Boolean Block",
    addBlockHat: "Add Hat Block",
    delSure: "delete this block?",
    uniqBlockId: "* block ID should be unique",
    uniqBlockName: "* block parameter names should be unique",
  },
  zh: {
    extID: "插件ID",
    extName: "插件名称",
    preview: "生成预览",
    extdef: "插件定义",
    extimg: "插件图标",
    maincolor: "插件颜色",
    secondcolor: "变量颜色",
    menuIcon: "菜单栏图标",
    blockIcon: "方块图标",
    addLabel: "添加文本",
    addInput: "添加文本变量",
    addInputNum: "添加数字变量",
    addBool: "添加布尔变量",
    addblock: "添加方块",
    addBlockFun: "添加函数方块",
    addBlockOutput: "添加输出方块",
    addBlockBool: "添加布尔方块",
    addBlockHat: "添加帽子方块",
    delSure: "删除该方块?",
    uniqBlockId: "* 积木ID需要全局唯一",
    uniqBlockName: "* 积木参数名字需要唯一",
  }
});

const emptyToolBox = `<xml style="display: none">
<category name="Test" id="testExt" colour="#0FBD8C" secondaryColour="#0DA57A" >
</category>
</xml>`;

const OUTPUT_SHAPE_HEXAGONAL = 1;
const OUTPUT_SHAPE_ROUND = 2;
const OUTPUT_SHAPE_SQUARE = 3;

const BlockTypeMap = {
  func: "COMMAND",
  output: "REPORTER",
  bool: "BOOLEAN",
  hat: "HAT"
}

class App extends Component {
  constructor (props){
    super(props);
    this.state = {
      collapsed: true,
      extID: 'testExt',
      extName: 'Test',
      color1Pick: false,
      color2Pick: false,
      color1: '#0FBD8C',
      color2: '#0DA57A',
      menuIcon: null,
      blockIcon: null,
      editBlockID: 'newblock',
      blocks: [],
      menus: [],
      addBlockType: '',
      showMutation: false
    }
    bindAll(this, [
      "uploadMenuIcon",
      "uploadBlockIcon",
      "closeMutationModal",
      "generatePreview",
      "addBlockFun",
      "addBlockOutput",
      "addBlockBool",
      "addBlockHat",
      "addLabel",
      "addInput",
      "addInputNum",
      "addBool",
      "applyMutation",
      "injectDeclareWorkspace",
      "makeBlock",
      "editBlock",
      "deleteBlock",
      "saveToJson",
      "loadFromJson",
      "exportJs"
    ]);

    this.blockColumn = [{
      title: 'Op Code',
      dataIndex: 'opcode',
      key: 'opcode',
      width: '20%',
      render: text => <a href="javascript:;">{text}</a>,
    }, {
      title: 'Preview',
      dataIndex: 'svg',
      key: 'svg',
      render: (text, record) => (
        <img src={`data:image/svg+xml;charset=utf-8,${text}`} />
      )
    }, {
      title: 'Action',
      key: 'action',
      render: (text, record) => (
        <span>
          <a href="#" onClick={() => this.editBlock(record.opcode)} >Edit {record.name}</a>
          <Divider type="vertical" />
          <Popconfirm title={strings.delSure} onConfirm={() => this.deleteBlock(record.opcode)}>
            <a href="#">Delete</a>
          </Popconfirm>
        </span>
      ),
    }];
  }

  componentDidMount (){
    this.previewWorkspace = Blockly.inject('preview', {
      media: './media/',
      toolbox: emptyToolBox,
      zoom: {
        startScale: 0.75
      }
    });

    Blockly.Procedures.externalProcedureDefCallback = function (mutation, cb) {
      console.log("externalProcedureDefCallback");
    }
    this.previewWorkspace.getFlyout().setRecyclingEnabled(false);
    window.ws = this.previewWorkspace;
  }

  uploadMenuIcon (file){
    let reader = new FileReader();
    const _this = this;
    reader.onerror = function () {
      console.warn("read image file error")
    };

    reader.onload = function (ev) {
      const dataUri = reader.result;
      _this.setState({menuIcon: dataUri});
    };
    reader.readAsDataURL(file);
  }

  uploadBlockIcon (file){
    let reader = new FileReader();
    const _this = this;
    reader.onerror = function () {
      console.warn("read image file error")
    };

    reader.onload = function (ev) {
      const dataUri = reader.result;
      _this.setState({blockIcon: dataUri});
    };
    reader.readAsDataURL(file);
  }

  generatePreview (){
    const xmlParts = [];
    this.previewWorkspace.clear();

    const colorXML = `colour="${this.state.color1}" secondaryColour="${this.state.color2}"`;
    let menuIconURI = '';
    if (this.state.menuIcon) {
        menuIconURI = this.state.menuIcon;
    } else if (this.state.blockIcon) {
        menuIconURI = this.state.blockIcon;
    }
    const blockJsons = [];
    const menuIconXML = menuIconURI ?
        `iconURI="${menuIconURI}"` : '';
    xmlParts.push(`<xml style="display: none">`);
    xmlParts.push(`<category name="${this.state.extName}" id="${this.state.extID}" ${colorXML} ${menuIconXML}>`);
    xmlParts.push.apply(xmlParts, this.state.blocks.map(block => {
      const extendedOpcode = `${this.state.extID}_${block.opcode}`;
      let argIndex = 0;
      const blockJSON = {
        type: extendedOpcode,
        category: this.state.extName,
        colour: this.state.color1,
        inputsInline: true,
        colourSecondary: this.state.color2,
        extensions: ['scratch_extension']
      };
      const iconURI = this.state.blockIcon;

      if (iconURI) {
          blockJSON.message0 = '%1 %2';
          const iconJSON = {
              type: 'field_image',
              src: iconURI,
              width: 40,
              height: 40
          };
          const separatorJSON = {
              type: 'field_vertical_separator'
          };
          blockJSON.args0 = [
              iconJSON,
              separatorJSON
          ];
          argIndex+=1;
      }

      blockJSON[`message${argIndex}`] = block.msg;
      blockJSON[`args${argIndex}`] = block.args.map(arg => arg.json);


      if (block.type === 'func'){
        blockJSON.outputShape = OUTPUT_SHAPE_SQUARE;
        blockJSON.nextStatement = null;
        blockJSON.previousStatement = null;
      } else if (block.type === 'output'){
        blockJSON.outputShape = OUTPUT_SHAPE_ROUND;
        blockJSON.output = "String";
        blockJSON.checkboxInFlyout = true;
      } else if (block.type === 'bool'){
        blockJSON.output = "Boolean";
        blockJSON.outputShape = OUTPUT_SHAPE_HEXAGONAL;
      }

      blockJsons.push(blockJSON);
      const inputXML = block.args.map(arg => {
        const inputList = [];
        const placeholder = arg.placeholder.replace(/[<"&]/, '_');
        const shadowType = arg.shadowType;
        const fieldType = arg.fieldType;
        const defaultValue = arg.defaultValue || '';
        inputList.push(`<value name="${placeholder}">`);
        if (shadowType) {
          inputList.push(`<shadow type="${shadowType}">`);
          inputList.push(`<field name="${fieldType}">${defaultValue}</field>`);
          inputList.push('</shadow>');
        }
        inputList.push('</value>');
        
        return inputList.join('');
      });
      let blockXML = `<block type="${extendedOpcode}">${inputXML.join('')}</block>`;
      return blockXML;
    }));
    xmlParts.push('</category>');
    xmlParts.push(`</xml>`);
    Blockly.defineBlocksWithJsonArray(blockJsons);
    console.log("extension", xmlParts);
    this.previewWorkspace.updateToolbox(xmlParts.join('\n'));
  }

  closeMutationModal (){
    this.declareWorkspace.clear();
    this.setState({showMutation: false})
  }

  makeBlock (blockType, mutationText){
    this.mutationRoot = this.declareWorkspace.newBlock('procedures_declaration');
    // this.mutationRoot.setMovable(false);
    this.mutationRoot.setDeletable(false);
    this.mutationRoot.contextMenu = false;

    // override default custom procedure insert
    this.mutationRoot.addStringNumberExternal = function(isNum) {
      Blockly.WidgetDiv.hide(true);
      if (isNum){
        this.procCode_ = this.procCode_ + ' %n';
        this.displayNames_.push('X');
      } else {
        this.procCode_ = this.procCode_ + ' %s';
        this.displayNames_.push('TXT');
      }
      this.argumentIds_.push(Blockly.utils.genUid());
      this.argumentDefaults_.push('');
      this.updateDisplay_();
      this.focusLastEditor_();
    };

    // this.mutationRoot.domToMutation(this.props.mutator);
    if (!mutationText){
      mutationText = '<xml>' +
        '<mutation' +
        ' proccode="' + Blockly.Msg['PROCEDURE_DEFAULT_NAME'] + '"' +
        ' argumentids="[]"' +
        ' argumentnames="[]"' +
        ' argumentdefaults="[]"' +
        ' warp="false">' +
        '</mutation>' +
        '</xml>';
    }
    const dom = Blockly.Xml.textToDom(mutationText).firstChild;
    this.mutationRoot.domToMutation(dom);
    this.mutationRoot.initSvg();
    this.mutationRoot.render();
    if (blockType === 'bool' || blockType === 'output'){
      this.mutationRoot.setPreviousStatement(false, null);
      this.mutationRoot.setNextStatement(false, null);
      this.mutationRoot.setInputsInline(true);
      if (blockType === 'output'){
        this.mutationRoot.setOutputShape(Blockly.OUTPUT_SHAPE_ROUND);
        this.mutationRoot.setOutput(true, 'Boolean');
      } else {
        this.mutationRoot.setOutputShape(Blockly.OUTPUT_SHAPE_HEXAGONAL);
        this.mutationRoot.setOutput(true, 'Number');
      }
    } else {

    }
    const {x, y} = this.mutationRoot.getRelativeToSurfaceXY();
    const dy = (360 / 2) - (this.mutationRoot.height / 2) - y;
    const dx = (480 / 2) - (this.mutationRoot.width / 2) - x;
    this.mutationRoot.moveBy(dx, dy);
    window.mu = this.mutationRoot;
  }

  injectDeclareWorkspace (ref){
    this.blocks = ref;
    const oldDefaultToolbox = Blockly.Blocks.defaultToolbox;
    Blockly.Blocks.defaultToolbox = null;
    this.declareWorkspace = Blockly.inject('declare', {
      media: './media/'
    });
    Blockly.Blocks.defaultToolbox = oldDefaultToolbox;
    
    const _this = this;
    this.declareWorkspace.addChangeListener(function(evt) {
      // console.log(Object.getPrototypeOf(evt).type, evt);
      if (_this.mutationRoot) {
        // todo: blockly turn %n to %s in updateDeclarationProcCode_
        _this.mutationRoot.onChangeFn();
      }
    });
    this.makeBlock(this.state.addBlockType);
  }

  applyMutation (){
    const svg = this.mutationRoot.getSvgRoot();
    const bbox = svg.getBBox();
    svg.removeAttribute('transform');
    let xml = (new XMLSerializer).serializeToString(svg);
    xml = `<svg id="src" xmlns="http://www.w3.org/2000/svg" width="${bbox.width}" height="${bbox.height}" >
    ${xml}
    </svg>`;

    const mutation = this.mutationRoot.mutationToDom(true)
    // console.log(mutation);
    const argNames = JSON.parse(mutation.getAttribute('argumentnames'));
    const args = [];

    // parse proc code
    let argCnt = 0;
    const args0 = [];
    let proccode = this.mutationRoot.getProcCode();
    proccode = proccode.split(" ");
    for (let n=0; n<proccode.length; n++){
      const p = proccode[n];
      if (p === '%s'){ // string
        const argName = argNames[argCnt];
        const arg = {
          argType: 'STRING',
          placeholder: argName,
          shadowType: 'text',
          fieldType: 'TEXT',
          json: {type: "input_value", name: argName}
        }
        proccode[n] = `%${argCnt+1}`;
        args.push(arg);
        argCnt+=1;
      } else if (p === '%b'){ // bool
        const argName = argNames[argCnt];
        const arg = {
          argType: 'BOOLEAN',
          placeholder: argName,
          // shadowType: 'text',
          // fieldType: 'NUM'
          check: 'Boolean',
          json: {type: "input_value", name: argName, check: "Boolean"}
        }
        proccode[n] = `%${argCnt+1}`;
        args.push(arg);
        argCnt+=1;
      } else if (p === '%n'){ // number
        const argName = argNames[argCnt];
        const arg = {
          argType: 'NUMBER',
          placeholder: argName,
          shadowType: 'math_number',
          fieldType: 'NUM',
          json: {type: "input_value", name: argName}
        }
        proccode[n] = `%${argCnt+1}`;
        args.push(arg);
        argCnt+=1;
      }
    }

    const msg = proccode.join(" ");
    const mutationText = `<xml>${Blockly.Xml.domToText(mutation)}</xml>`;
    const newBlock = {
      opcode: this.state.editBlockID,
      svg: xml,
      msg,
      args,
      mutationText: mutationText,
      type: this.state.addBlockType
    };
    const blocks = [...this.state.blocks].filter(blk => blk.opcode !== this.state.editBlockID);
    blocks.push(newBlock);
    
    this.setState({
      showMutation: false,
      blocks: blocks
    });
  }

  addLabel (){
    this.mutationRoot.addLabelExternal();
  }
  addInput (){
    this.mutationRoot.addStringNumberExternal();
  }
  addInputNum (){
    this.mutationRoot.addStringNumberExternal(true);
  }
  addBool (){
    this.mutationRoot.addBooleanExternal();
  }
  addBlockFun (){
    this.setState({
      showMutation: true,
      addBlockType: 'func',
    });
    if (this.declareWorkspace){
      this.declareWorkspace.clear();
      this.makeBlock();
    }

  }

  addBlockOutput (){
    this.setState({
      addBlockType: 'output',
      showMutation: true
    });
    if (this.declareWorkspace){
      this.declareWorkspace.clear();
      this.makeBlock('output');
    }
  }

  addBlockBool (){
    this.setState({
      addBlockType: 'bool',
      showMutation: true
    });
    if (this.declareWorkspace){
      this.declareWorkspace.clear();
      this.makeBlock('bool');

    }

  }

  addBlockHat (){
    this.setState({
      addBlockType: 'hat',
      showMutation: true
    });
    if (this.declareWorkspace){
      this.declareWorkspace.clear();
      this.makeBlock('hat');
    }

  }

  editBlock (opcode){
    const block = this.state.blocks.filter(blk => blk.opcode === opcode);
    if (block && block.length == 1){
      this.declareWorkspace.clear();
      this.makeBlock(block[0].type, block[0].mutationText);
      this.setState({
        showMutation: true,
        addBlockType: block[0].type
      });
    }
  }

  deleteBlock (opcode){
    const blocks = [...this.state.blocks].filter(blk => blk.opcode !== opcode);
    this.setState({blocks});
  }

  saveToJson (){
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.state, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", this.state.extID + ".json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  loadFromJson (file){
    if (file){
      let reader = new FileReader();
      const _this = this;
      reader.onerror = function () {
          console.warn("read image file error")
      };
      reader.onload = ev => {
        this.setState(Object.assign({},
          JSON.parse(reader.result)
        ))
      }
      reader.readAsText(file);
    }
  }

  exportJs (){
    const className = this.state.extID;
    const blockFunctions = [];
    const blocksInfo = [];

    for (const block of this.state.blocks){
      let txt = block.msg;
      let argIndex = 1;
      const blockCode = {
        opcode: `'${block.opcode}'`,
        blockType: `BlockType.${BlockTypeMap[block.type]}`
      };
      if (block.args.length){
        blockCode.arguments = {};
        for (let n=0;n<block.args.length;n++){
          const arg = block.args[n];
          txt = txt.replace(`%${argIndex}`, `[${arg.json.name}]`);
          // todo: fix missing %n define in custom procedure
          blockCode.arguments[`${arg.json.name}`] = {
            type: `ArgumentType.${arg.argType}`
          }
          argIndex+=1;
        }
      }
      blockCode.text = `'${txt}'`;
      blocksInfo.push(blockCode)
      blockFunctions.push(`  ${block.opcode}(args){
    
  }`)
    }

    let blkInfoCode = JSON.stringify(blocksInfo, null, 2);
    blkInfoCode = blkInfoCode.replace(/"/g, '');
    blkInfoCode = blkInfoCode.replace(/\n/g, '\n      ')

    const menuIconURI = this.state.menuIcon ? `"${this.state.menuIcon}"` : 'null';
    const blockIconURI = this.state.blockIcon ? `"${this.state.blockIcon}"` : 'null';

    const indexJS = `
// create by scratch3-extension generator
const ArgumentType = Scratch.ArgumentType;
const BlockType = Scratch.BlockType;
const formatMessage = Scratch.formatMessage;
const log = Scratch.log;

const menuIconURI = ${menuIconURI};
const blockIconURI = ${blockIconURI};

class ${className}{
  constructor (runtime){
    this.runtime = runtime;
  }

  getInfo (){
    return {
      id: '${this.state.extID}',
      name: '${this.state.extName}',
      color1: '${this.state.color1}',
      color2: '${this.state.color2}',
      menuIconURI: menuIconURI,
      blockIconURI: blockIconURI,
      blocks: ${blkInfoCode}
    }
  }
${blockFunctions.join('\n')}
}

module.exports = ${className};
`;
    console.log(indexJS);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(indexJS);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "index.js");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  render() {
    return (
      <Layout style={{height: '100vh'}}>
        <Sider
          trigger={null}
          collapsible
          collapsed={this.state.collapsed}
        >
          <div className="logo" />
          <Menu theme="dark" mode="inline" defaultSelectedKeys={['1']}>
            <Menu.Item key="1">
              <Icon type="plus" />
              <span>New Extension</span>
            </Menu.Item>
          </Menu>
        </Sider>
        <Layout>
          <Header style={{ background: '#fff', padding: 0 }}>
            <Icon
              className="trigger"
              type={this.state.collapsed ? 'menu-unfold' : 'menu-fold'}
              onClick={() => this.setState({collapsed: !this.state.collapsed})}
            />
          </Header>
          <Content style={{
            margin: '24px 16px', padding: 24, background: '#fff', minHeight: 280,
          }}
          >
            <Row>
              <Col span={14}>
                <Divider>{strings.extdef}</Divider>
                <Row className="config-row">
                  <Col span={2}>
                    <p>{strings.extID}</p>
                  </Col>
                  <Col span={3}>
                    <Input value={this.state.extID} onChange={e => this.setState({extID: e.target.value})} />
                  </Col>
                  <Col span={2} offset={1}>
                    <p>{strings.extName}</p>
                  </Col>
                  <Col span={3}>
                    <Input value={this.state.extName} onChange={e => this.setState({extName: e.target.value})} />
                  </Col>
                </Row>
                <Row className="config-row">
                  <Col span={2}>{strings.maincolor}</Col>
                  <Col span={3}>
                    <div className="color-display" style={{background: this.state.color1}} onClick={()=>this.setState({color1Pick: true})} />
                    { this.state.color1Pick ? <div style={{position: "absolute", zIndex: '2'}}>
                      <div className="color-cover" onClick={()=>this.setState({color1Pick: false})}/>
                        <SketchPicker color={ this.state.color1 } onChange={c => this.setState({color1: c.hex})} />
                      </div> : null }
                  </Col>
                  <Col span={2}>{strings.secondcolor}</Col>
                  <Col span={3}>
                    <div className="color-display" style={{background: this.state.color2}} onClick={()=>this.setState({color2Pick: true})} />
                    { this.state.color2Pick ? <div style={{position: "absolute", zIndex: '2'}}>
                      <div className="color-cover" onClick={()=>this.setState({color2Pick: false})}/>
                        <SketchPicker color={ this.state.color2 } onChange={c => this.setState({color2: c.hex})} />
                      </div> : null }
                  </Col>
                </Row>
                <Divider>{strings.extimg}</Divider>
                <Row className="config-row">
                  <Col span={4}>
                    {this.state.menuIcon ? <img className="icon-img" src={this.state.menuIcon} /> : null}
                    <Upload
                        name="projheader"
                        accept=".png,.svg"
                        className="header-uploader"
                        showUploadList={false}
                        beforeUpload={this.uploadMenuIcon}
                    >
                        <Button><Icon type="picture"/>{strings.menuIcon}</Button>
                    </Upload>
                  </Col>
                  <Col span={4}>
                    {this.state.blockIcon ? <img className="icon-img" src={this.state.blockIcon} /> : null}
                    <Upload
                        name="projheader"
                        accept=".png,.svg"
                        className="header-uploader"
                        showUploadList={false}
                        beforeUpload={this.uploadBlockIcon}
                    >
                        <Button><Icon type="picture"/>{strings.blockIcon}</Button>
                    </Upload>
                  </Col>
                </Row>
                <Divider>{strings.addblock}</Divider>
                <Row className="btn-wrap">
                  <Button onClick={this.addBlockFun}>{strings.addBlockFun}</Button>
                  <Button onClick={this.addBlockOutput}>{strings.addBlockOutput}</Button>
                  <Button onClick={this.addBlockBool}>{strings.addBlockBool}</Button>
                  <Button onClick={this.addBlockHat}>{strings.addBlockHat}</Button>
                </Row>
                <Divider></Divider>
                <Table columns={this.blockColumn} dataSource={this.state.blocks} />
              </Col>
              <Col span={8} offset={1}>
                <Button type="primary" shape="round" icon="picture" onClick={this.generatePreview}>{strings.preview}</Button>
                <div id="preview" style={{height: 600, width: 480, marginTop: 10}}></div>
                <Row className="btn-wrap">
                  <Button onClick={this.saveToJson}>Save</Button>
                  <Upload 
                    name="jsonUpload"
                    accept=".json"
                    className="header-uploader"
                    showUploadList={false}
                    beforeUpload={this.loadFromJson}
                  >
                    <Button>Open</Button>
                  </Upload>
                  
                  <Button type="primary" onClick={this.exportJs}>Export index.js</Button>
                </Row>
              </Col>
            </Row>
          </Content>
        </Layout>
        <Modal
            title="Modify Block"
            visible={this.state.showMutation}
            onOk={this.applyMutation}
            onCancel={this.closeMutationModal}
        >
          <div id="declare" style={{width: 480, height: 360}} ref={this.injectDeclareWorkspace}></div>
          <div className="btn-wrap">
            <Button onClick={this.addLabel}>{strings.addLabel}</Button>
            <Button onClick={this.addInput}>{strings.addInput}</Button>
            <Button onClick={this.addInputNum}>{strings.addInputNum}</Button>
            <Button onClick={this.addBool}>{strings.addBool}</Button>
          </div>
          <p>{strings.uniqBlockName}</p>
          <Divider />
          <Row>
            <Col span={3}>
              <p>Block ID</p>
            </Col>
            <Col span={8}>
              <Input value={this.state.editBlockID} onChange={e => this.setState({editBlockID: e.target.value})} />
            </Col>
            <Col span={12}>
              <p>{strings.uniqBlockId}</p>
            </Col>
          </Row>
        </Modal>
      </Layout>
    );
  }
}

export default App;
