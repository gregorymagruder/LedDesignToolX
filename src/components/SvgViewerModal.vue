<template>
    <div>
        <button id="show-modal" @click="showModal = true">Show Modal</button>
        <!-- <modal v-if="showModal" @close="showModal = false" name="modal"> -->
        <modal @close="showModal = false" name="modal">
            <!-- <h3 slot="header">custom header</h3> -->
        <div class="modal-mask" @click="close" v-show="show">
            <div class="modal-container" @click.stop>
                <div class="modal-header">
                    <h3>New Post</h3>
                </div>
                <div class="modal-body">
                    <label class="form-label">
                        Title
                        <input class="form-control">
                    </label>
                    <label class="form-label">
                        Body
                        <textarea rows="5" class="form-control"></textarea>
                    </label>
                </div>
                <div class="modal-footer text-right">
                    <button class="modal-default-button" @click="close">
                        Save
                    </button>
                </div>
            </div>
        </div>            
        </modal>
    </div>


 <!-- <transition name="modal">
        <div class="modal-mask" @click="close" v-show="show">
            <div class="modal-container" @click.stop>
                <div class="modal-header">
                    <h3>New Post</h3>
                </div>
                <div class="modal-body">
                    <label class="form-label">
                        Title
                        <input class="form-control">
                    </label>
                    <label class="form-label">
                        Body
                        <textarea rows="5" class="form-control"></textarea>
                    </label>
                </div>
                <div class="modal-footer text-right">
                    <button class="modal-default-button" @click="close">
                        Save
                    </button>
                </div>
            </div>
        </div>
    </transition> -->

</template>


<script>
    export default {
        data() {
            return {
                showModal: false
            }
        },
        methods: {
            close() {
                this.$emit('close');
            },
        },
    }

    // <script type="text/x-template" id="modal-template">
    //   <transition name="modal">
    //     <div class="modal-mask">
    //       <div class="modal-wrapper">
    //         <div class="modal-container">

    //           <div class="modal-header">
    //             <slot name="header">
    //               default header
    //             </slot>
    //           </div>

    //           <div class="modal-body">
    //             <slot name="body">
    //               default body
    //             </slot>
    //           </div>

    //           <div class="modal-footer">
    //             <slot name="footer">
    //               default footer
    //               <button class="modal-default-button" @click="$emit('close')">
    //                 OK
    //               </button>
    //             </slot>
    //           </div>
    //         </div>
    //       </div>
    //     </div>
    //   </transition>
    //
</script>

</script>