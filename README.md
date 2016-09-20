# AnnoteJS Framework - annotations support framework

### Installation

`npm install annoteJS`

### Usage

There are two types of annotation types supported:

1. **Decorator** means that this type of annotation proxies the request through the annotation function and afterwards based on the annotation's implementation it calls or not the original function.
2. **NonDecorator** means that the annotation is called first before instantiating the annotated class so it can decide what it should do with the specified class. In general we use this type of annotations if we don't intend to later use the annotated modules as standalone. For example a routing annotation does this.


